-- 알림: 앱 안 알림함 + 웹 푸시 구독

create table notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  team_id uuid references teams(id) on delete cascade,
  title text not null,
  body text,
  url text,
  read_at timestamptz,
  created_at timestamptz not null default now()
);
create index on notifications (user_id, created_at desc);
create index on notifications (team_id);
alter table notifications enable row level security;

-- 브라우저/기기마다 하나. endpoint가 기기 주소
create table push_subscriptions (
  endpoint text primary key,
  user_id uuid not null references users(id) on delete cascade,
  p256dh text not null,
  auth text not null,
  created_at timestamptz not null default now()
);
create index on push_subscriptions (user_id);
alter table push_subscriptions enable row level security;

-- "수합 마무리" 알림을 수합마다 한 번만 보내기 위한 표시. 새 수합/초기화 때 다시 false
alter table teams add column collect_done_notified boolean not null default false;
