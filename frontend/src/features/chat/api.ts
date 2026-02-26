import { api } from "@/shared/api/client";
import type { ChatResponse } from "@/shared/types/api";

export async function sendChatMessage(message: string) {
  const response = await api.post<ChatResponse>("/chat", { message });
  return response.data;
}
