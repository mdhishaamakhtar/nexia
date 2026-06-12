import { api } from "@/shared/api/client";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export async function sendChatMessage(messages: ChatMessage[]): Promise<{ response: string }> {
  const res = await api.post("chat", { json: { messages } });
  const text = await res.text();

  // Parse SSE stream to extract final assistant content
  const lines = text.split("\n");
  let finalContent = "";

  for (const line of lines) {
    if (line.startsWith("data: ")) {
      try {
        const data = JSON.parse(line.slice(6));
        // AI SDK UI message format: { type: "text-delta", textDelta: "..." }
        // or: { type: "finish", ... }
        if (data.type === "text-delta" && data.textDelta) {
          finalContent += data.textDelta;
        } else if (data.type === "finish" && data.content) {
          finalContent = data.content;
        }
      } catch {
        // Skip unparseable lines
      }
    }
  }

  return { response: finalContent || "No response received" };
}
