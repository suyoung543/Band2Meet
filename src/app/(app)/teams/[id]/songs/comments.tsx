import DialogButton from "@/components/DialogButton";
import CommentThread, { Comment } from "./comment-thread";

export type { Comment };

// 곡 댓글 버튼(말풍선 아이콘 + 개수) → 넓은 팝업 카드
export default function SongComments(props: {
  song: { id: string; title: string; artist: string | null };
  comments: Comment[];
  userId: string;
  isLeader: boolean;
  className: string;
}) {
  const { song, comments } = props;
  return (
    <DialogButton
      large
      title={song.artist ? `${song.title} - ${song.artist}` : song.title}
      ariaLabel={`댓글 ${comments.length}개`}
      className={props.className}
      label={
        <>
          {/* 말풍선: 글자색을 따라가서 다크 모드 흰색, 라이트 모드 검정 */}
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" aria-hidden>
            <path d="M21 12a8 8 0 0 1-11.6 7.1L4 20.5l1.4-4.6A8 8 0 1 1 21 12Z" />
          </svg>
          {comments.length}
        </>
      }
    >
      <CommentThread songId={song.id} comments={comments} userId={props.userId} isLeader={props.isLeader} />
    </DialogButton>
  );
}
