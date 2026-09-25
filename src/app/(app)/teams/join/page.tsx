import { joinTeam } from "@/app/actions";
import SingleFieldForm from "../form";

export default async function JoinTeamPage({ searchParams }: PageProps<"/teams/join">) {
  const { error } = await searchParams;
  return (
    <SingleFieldForm
      title="초대코드로 참여"
      description="리더에게 받은 8자리 코드를 입력하세요. 리더가 승인하면 팀에 들어갈 수 있어요."
      action={joinTeam}
      name="code"
      placeholder="8자리 코드"
      submit="참여 요청"
      error={error ? "초대코드에 맞는 팀이 없어요." : undefined}
    />
  );
}
