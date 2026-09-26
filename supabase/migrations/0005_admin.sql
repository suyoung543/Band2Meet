-- 관리자 대시보드: 관리자 표시, 일별 이용 기록, DB 용량 조회

alter table users add column is_admin boolean not null default false;

-- 하루에 유저당 한 줄. views = 그날 앱을 연 횟수(대략)
create table daily_activity (
  day date not null,
  user_id uuid not null references users(id) on delete cascade,
  views int not null default 1,
  primary key (day, user_id)
);
create index on daily_activity (user_id);
alter table daily_activity enable row level security;

create function track_activity(p_user uuid, p_day date) returns void
language sql set search_path = '' as $$
  insert into public.daily_activity (day, user_id) values (p_day, p_user)
  on conflict (day, user_id) do update set views = public.daily_activity.views + 1
$$;

create function db_size_bytes() returns bigint
language sql stable set search_path = '' as $$
  select pg_database_size(current_database())
$$;

-- 서버(service_role)만 호출 가능
revoke execute on function track_activity(uuid, date), db_size_bytes() from public, anon, authenticated;
grant execute on function track_activity(uuid, date), db_size_bytes() to service_role;
