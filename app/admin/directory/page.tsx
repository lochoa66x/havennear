import { requireChatGPTUser } from "../../chatgpt-auth";
import DirectoryReviewClient from "./DirectoryReviewClient";

export const dynamic = "force-dynamic";

export default async function DirectoryReviewPage() {
  const user = await requireChatGPTUser("/admin/directory");
  return <DirectoryReviewClient displayName={user.displayName} />;
}
