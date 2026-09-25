-- 인증은 카카오 OAuth를 Next.js 서버에서 직접 처리하고, DB 접근은 서버에서 service_role 키로만 한다.
-- 그래서 모든 테이블에 RLS를 켜고 정책은 두지 않는다 (anon/authenticated 키로는 아무것도 못 읽음).

-- 슬롯 상태: 30분 x 48칸을 한 글자씩. y=가능 n=불가능 m=미정. 인덱스 0 = 00:00
create domain slot_row as text check (value ~ '^[ynm]{48}$');

create table users (
  id uuid primary key default gen_random_uuid(),
  kakao_id bigint not null unique,
  nickname text not null,
  email text,
  profile_image text,
  created_at timestamptz not null default now()
);

create table teams (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  leader_id uuid not null references users(id),
  invite_code text not null unique default substr(md5(random()::text), 1, 8),
  -- 수합 기간 / 마감
  collect_start date,
  collect_end date check (collect_end >= collect_start),
  deadline timestamptz,
  min_block_slots smallint not null default 4 check (min_block_slots > 0), -- 최소 연속 시간 (4칸 = 2시간)
  created_at timestamptz not null default now()
);

create table team_members (
  team_id uuid not null references teams(id) on delete cascade,
  user_id uuid not null references users(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'active')), -- 초대코드 참여 → 리더 승인
  joined_at timestamptz not null default now(),
  primary key (team_id, user_id)
);
create index on team_members (user_id);

-- 기본 패턴: 유저 전역 (모든 밴드에 공통)
create table base_patterns (
  user_id uuid not null references users(id) on delete cascade,
  day smallint not null check (day between 0 and 6), -- 0 = 월
  slots slot_row not null,
  primary key (user_id, day)
);

-- 예외: 특정 날짜의 그리드 전체를 덮어씀. 행 삭제 = 기본 패턴으로 되돌리기
create table exceptions (
  user_id uuid not null references users(id) on delete cascade,
  date date not null,
  slots slot_row not null,
  primary key (user_id, date)
);

-- 확정된 합주. 교집합 계산 시 멤버의 다른 팀 확정 일정은 '불가'로 취급 (예외 테이블에 복사하지 않음 → 확정 취소도 행 삭제로 끝)
create table confirmed_schedules (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references teams(id) on delete cascade,
  date date not null,
  start_slot smallint not null check (start_slot between 0 and 47),
  end_slot smallint not null check (end_slot between 1 and 48 and end_slot > start_slot), -- exclusive
  memo text,
  created_by uuid references users(id) on delete set null,
  created_at timestamptz not null default now()
);
create index on confirmed_schedules (team_id, date);

create table songs (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references teams(id) on delete cascade,
  title text not null,
  artist text,
  ref_url text,
  duration_sec int check (duration_sec > 0), -- 셋리스트 러닝타임 합산용
  status text not null default 'candidate' check (status in ('candidate', 'practicing', 'setlist', 'hold')),
  created_by uuid references users(id) on delete set null,
  created_at timestamptz not null default now()
);
create index on songs (team_id, status);

create table votes (
  song_id uuid not null references songs(id) on delete cascade,
  user_id uuid not null references users(id) on delete cascade,
  primary key (song_id, user_id)
);

create table practice_assignments (
  id uuid primary key default gen_random_uuid(),
  song_id uuid not null references songs(id) on delete cascade,
  schedule_id uuid references confirmed_schedules(id) on delete set null, -- "이번 합주까지"
  created_at timestamptz not null default now()
);
create index on practice_assignments (song_id);
create index on practice_assignments (schedule_id);

-- 멤버별 진행 상황 자유 코멘트
create table practice_notes (
  assignment_id uuid not null references practice_assignments(id) on delete cascade,
  user_id uuid not null references users(id) on delete cascade,
  comment text not null,
  updated_at timestamptz not null default now(),
  primary key (assignment_id, user_id)
);

create table setlists (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references teams(id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now()
);
create index on setlists (team_id);

create table setlist_items (
  setlist_id uuid not null references setlists(id) on delete cascade,
  song_id uuid not null references songs(id) on delete cascade,
  position int not null,
  memo text, -- 키 변경, 전환 큐, MR 유무 등
  primary key (setlist_id, song_id)
);

-- FK 인덱스 (advisor 권장)
create index on teams (leader_id);
create index on votes (user_id);
create index on practice_notes (user_id);
create index on setlist_items (song_id);
create index on confirmed_schedules (created_by);
create index on songs (created_by);

alter table users enable row level security;
alter table teams enable row level security;
alter table team_members enable row level security;
alter table base_patterns enable row level security;
alter table exceptions enable row level security;
alter table confirmed_schedules enable row level security;
alter table songs enable row level security;
alter table votes enable row level security;
alter table practice_assignments enable row level security;
alter table practice_notes enable row level security;
alter table setlists enable row level security;
alter table setlist_items enable row level security;
