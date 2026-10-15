-- 곡 댓글 (후보함)
create table song_comments (
  id uuid primary key default gen_random_uuid(),
  song_id uuid not null references songs(id) on delete cascade,
  user_id uuid not null references users(id) on delete cascade,
  body text not null check (length(body) between 1 and 500),
  created_at timestamptz not null default now()
);
create index on song_comments (song_id, created_at);
create index on song_comments (user_id);
alter table song_comments enable row level security;
