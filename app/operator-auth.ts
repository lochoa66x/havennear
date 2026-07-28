import { getChatGPTUser, requireChatGPTUser } from "./chatgpt-auth";
import { isPlatformOperator } from "../db/participation";

export async function requireOperatorPage(returnTo: string) {
  const user = await requireChatGPTUser(returnTo);
  const operator = await isPlatformOperator(user.email, user.displayName, true);
  return { user, operator };
}

export async function requireOperatorApi() {
  const user = await getChatGPTUser();
  if (!user) return null;
  const operator = await isPlatformOperator(user.email, user.displayName, true);
  return operator ? user : null;
}
