import { api } from "@/shared/api/client";
import type { ChatResponse } from "@/shared/types/api";

export async function sendChatMessage(message: string) {
  return api.post("chat", { json: { message } }).json<ChatResponse>();
}
