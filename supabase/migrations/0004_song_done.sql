-- 곡 상태: 안 쓰는 setlist 대신 done(연습 완료)
alter table songs drop constraint songs_status_check;
update songs set status = 'done' where status = 'setlist';
alter table songs add constraint songs_status_check check (status in ('candidate', 'practicing', 'done', 'hold'));
