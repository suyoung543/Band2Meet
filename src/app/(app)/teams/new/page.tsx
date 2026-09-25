import { createTeam } from "@/app/actions";
import SingleFieldForm from "../form";

export default async function NewTeamPage({ searchParams }: PageProps<"/teams/new">) {
  const { error } = await searchParams;
  return (
    <SingleFieldForm
      title="팀 만들기"
      description="만든 사람이 리더가 돼요. 만든 뒤 초대코드를 멤버들에게 공유하세요."
      action={createTeam}
      name="name"
      placeholder="밴드 이름"
      submit="만들기"
      maxLength={40}
      error={error ? "팀 이름을 입력해 주세요." : undefined}
    />
  );
}
