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
import { AlertCircle, Sparkles } from "lucide-react";

function StreamingIndicator({ status }: { status: string }) {
  if (status !== "submitted" && status !== "streaming") return null;

  const label = status === "submitted" ? "thinking" : "streaming";

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 4 }}
      transition={{ type: "spring", stiffness: 260, damping: 24 }}
      className="flex w-full items-start gap-3"
    >
      <div
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-2xl border"
        style={{
          background: "var(--blue)",
          borderColor: "rgba(147,197,253,0.4)",
          boxShadow: "0 2px 8px rgba(147,197,253,0.25)",
        }}
      >
        <NexiaIcon size={18} className="text-white" />
      </div>
      <div
        className="flex items-center gap-2 rounded-2xl rounded-tl-sm border px-4 py-3"
        style={{ background: "var(--bg-raised)", borderColor: "var(--border)" }}
      >
        <Sparkles size={14} className="animate-pulse" style={{ color: "var(--blue)" }} />
        <span className="text-sm font-medium" style={{ color: "var(--text-2)" }}>
          {label}...
        </span>
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
    <main className="mx-auto flex h-[calc(100dvh-48px)] max-w-3xl flex-col overflow-hidden px-4 py-4">
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
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{
                      type: "spring",
                      stiffness: 220,
                      damping: 26,
                    }}
                  >
                    <ChatMessage message={message} />
                  </motion.div>
                ))
              )}
            </AnimatePresence>

            <StreamingIndicator status={status} />

            {status === "error" && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="mx-auto mt-4 flex max-w-sm items-center gap-3 rounded-xl border px-4 py-3"
                style={{
                  borderColor: "var(--red-border)",
                  background: "var(--red-bg)",
                }}
              >
                <AlertCircle size={16} style={{ color: "var(--red)" }} />
                <div className="flex-1">
                  <p className="text-xs font-semibold" style={{ color: "var(--red)" }}>
                    Something went wrong
                  </p>
                </div>
                <button
                  onClick={() => regenerate()}
                  className="rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors hover:bg-(--red-bg-hover)"
                  style={{ color: "var(--red)" }}
                >
                  Try again
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
              placeholder="ask about someone's favorites, memories, or vibes..."
              onChange={(e) => setInput(e.currentTarget.value)}
              disabled={isBusy}
              className="min-h-[44px] bg-transparent text-(--text-1) placeholder:text-(--text-3)"
            />
          </PromptInputBody>
          <PromptInputFooter>
            <span className="text-[11px] font-medium" style={{ color: "var(--text-3)" }}>
              {isBusy
                ? status === "submitted"
                  ? "Thinking..."
                  : "Streaming..."
                : "Shift + Enter for new line"}
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
