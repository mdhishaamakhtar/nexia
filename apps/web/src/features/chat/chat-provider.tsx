"use client";

import { createContext, useContext, useState, type ReactNode } from "react";
import { Chat, useChat } from "@ai-sdk/react";
import { lastAssistantMessageIsCompleteWithApprovalResponses, type UIMessage } from "ai";
import { useQueryClient, type QueryClient } from "@tanstack/react-query";
import { profileKeys } from "@/features/profiles/hooks";
import { createChatTransport } from "./api";
import { extractWriteResult, isToolPart, isWriteTool } from "./lib/tool-meta";

const ChatContext = createContext<Chat<UIMessage> | null>(null);

function createChat(queryClient: QueryClient) {
  return new Chat<UIMessage>({
    transport: createChatTransport(),
    // After the person approves or declines a write, send the answer back so
    // the agent can carry on (and, if approved, actually save).
    sendAutomaticallyWhen: lastAssistantMessageIsCompleteWithApprovalResponses,
    onFinish: ({ message }) => {
      // A profile the agent saved should be current everywhere else at once.
      let touched = false;
      for (const part of message.parts) {
        if (!isToolPart(part) || part.state !== "output-available" || !isWriteTool(part)) continue;
        const result = extractWriteResult(part.output);
        if (!result) continue;
        touched = true;
        void queryClient.invalidateQueries({ queryKey: profileKeys.detail(result.id) });
      }
      if (touched) void queryClient.invalidateQueries({ queryKey: profileKeys.lists });
    },
  });
}

/**
 * Holds one conversation for as long as the person is signed in. It lives on
 * the dashboard layout, above the pages, so following a result card to a
 * profile and coming back finds the conversation where it was.
 */
export function ChatProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [chat] = useState(() => createChat(queryClient));
  return <ChatContext.Provider value={chat}>{children}</ChatContext.Provider>;
}

export function useNexiaChat() {
  const chat = useContext(ChatContext);
  if (!chat) throw new Error("useNexiaChat must be used within a ChatProvider");
  const helpers = useChat({ chat });
  return { ...helpers, clear: () => helpers.setMessages([]) };
}
