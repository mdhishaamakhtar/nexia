"use client";

import { useCallback } from "react";
import { useChat } from "@ai-sdk/react";
import type { UIMessage } from "ai";
import { useQueryClient } from "@tanstack/react-query";
import { createChatTransport } from "@/features/chat/api";
import {
  extractWriteResult,
  isToolPart,
  toolNameOf,
  WRITE_TOOL_NAMES,
} from "@/features/chat/lib/tool-meta";

/**
 * Chat state for Nexia Intel. Wraps `useChat` with the credentialed transport
 * and refreshes the profiles cache whenever the agent successfully creates or
 * updates a profile, so the rest of the app reflects the change immediately.
 */
export function useNexiaChat() {
  const queryClient = useQueryClient();

  const chat = useChat<UIMessage>({
    transport: createChatTransport(),
    onFinish: ({ message }) => {
      let touchedAny = false;
      for (const part of message.parts) {
        if (!isToolPart(part) || part.state !== "output-available") continue;
        if (!WRITE_TOOL_NAMES.includes(toolNameOf(part))) continue;
        const result = extractWriteResult(part.output);
        if (!result) continue;
        touchedAny = true;
        void queryClient.invalidateQueries({ queryKey: ["profile", String(result.id)] });
      }
      if (touchedAny) {
        void queryClient.invalidateQueries({ queryKey: ["profiles"] });
      }
    },
  });

  const { setMessages } = chat;
  const clear = useCallback(() => setMessages([]), [setMessages]);

  return { ...chat, clear };
}
