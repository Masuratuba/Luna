import { handleChatPost } from "./chat-handler";

export async function POST(request: Request) {
  return handleChatPost(request);
}
