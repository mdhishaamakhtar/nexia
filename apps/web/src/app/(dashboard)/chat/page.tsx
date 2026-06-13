"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Conversation,
  ConversationContent,
  ConversationScrollButton,
} from "@/components/ai-elements/conversation";
import {
  PromptInput,
  PromptInputBody,
  PromptInputFooter,
  PromptInputSubmit,
  PromptInputTextarea,
  type PromptInputMessage,
} from "@/components/ai-elements/prompt-input";
import { useNexiaChat } from "@/features/chat/hooks/use-nexia-chat";
import { ChatHeader } from "@/features/chat/components/chat-header";
import { ChatEmptyState } from "@/features/chat/components/chat-empty-state";
import { ChatMessage } from "@/features/chat/components/chat-message";
import { NexiaIcon } from "@/shared/ui/AIIcons";
import { AlertCircle } from "lucide-react";

function StreamingIndicator({ status }: { status: string }) {
  if (status !== "submitted" && status !== "streaming") return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -4 }}
      transition={{ type: "spring", stiffness: 300, damping: 28 }}
      className="flex w-full items-start gap-3"
    >
      <div
        className="mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-xl"
        style={{
          background: "var(--blue)",
          boxShadow: "0 1px 4px rgba(147,197,253,0.3)",
        }}
      >
        <NexiaIcon size={15} className="text-white" />
      </div>
      <div className="flex items-center gap-1 pt-2.5">
        <span className="streaming-dot" style={{ animationDelay: "0ms" }} />
        <span className="streaming-dot" style={{ animationDelay: "150ms" }} />
        <span className="streaming-dot" style={{ animationDelay: "300ms" }} />
      </div>
    </motion.div>
  );
}

export default function ChatPage() {
  const [input, setInput] = useState("");
  const { messages, status, sendMessage, regenerate, stop, clear } = useNexiaChat();

  const isBusy = status === "submitted" || status === "streaming";

  const submit = (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || isBusy) return;
    sendMessage({ text: trimmed });
    setInput("");
  };

  return (
    <main className="mx-auto flex h-[calc(100dvh-48px)] w-full max-w-4xl flex-col overflow-hidden px-6 py-3">
      <ChatHeader onClear={clear} />

      <div className="min-h-0 flex-1">
        <Conversation>
          <ConversationContent>
            <AnimatePresence initial={false} mode="popLayout">
              {messages.length === 0 ? (
                <ChatEmptyState key="empty" onPrompt={submit} />
              ) : (
                messages.map((message) => (
                  <motion.div
                    key={message.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ type: "spring", stiffness: 260, damping: 28 }}
                  >
                    <ChatMessage message={message} />
                  </motion.div>
                ))
              )}
            </AnimatePresence>

            <StreamingIndicator status={status} />

            {status === "error" && (
              <motion.div
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center gap-3 rounded-xl border px-4 py-3"
                style={{
                  borderColor: "var(--red-border)",
                  background: "var(--red-bg)",
                }}
              >
                <AlertCircle size={15} style={{ color: "var(--red)" }} />
                <p className="flex-1 text-[13px] font-medium" style={{ color: "var(--red)" }}>
                  Something went wrong
                </p>
                <button
                  onClick={() => regenerate()}
                  className="rounded-lg px-3 py-1.5 text-[12px] font-semibold transition-colors hover:bg-(--red-bg-hover)"
                  style={{ color: "var(--red)" }}
                >
                  Retry
                </button>
              </motion.div>
            )}
          </ConversationContent>
          <ConversationScrollButton />
        </Conversation>
      </div>

      <div className="shrink-0 pt-4">
        <PromptInput
          onSubmit={(message: PromptInputMessage) => submit(message.text)}
          className="w-full"
        >
          <PromptInputBody>
            <PromptInputTextarea
              value={input}
              placeholder="ask about your people..."
              onChange={(e) => setInput(e.currentTarget.value)}
              disabled={isBusy}
              className="min-h-[48px] bg-transparent text-[15px] text-(--text-1) placeholder:text-(--text-3)"
            />
          </PromptInputBody>
          <PromptInputFooter>
            <span className="text-[11px] font-medium" style={{ color: "var(--text-3)" }}>
              {isBusy
                ? status === "submitted"
                  ? "thinking..."
                  : "streaming..."
                : "shift + enter for new line"}
            </span>
            <PromptInputSubmit
              status={status}
              onStop={stop}
              disabled={isBusy ? false : !input.trim()}
            />
          </PromptInputFooter>
        </PromptInput>
      </div>
    </main>
  );
}
