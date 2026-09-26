import { handleChatPost } from "../../../lib/luna/chat-handler";

export async function POST(request: Request) {
  return handleChatPost(request);
}
