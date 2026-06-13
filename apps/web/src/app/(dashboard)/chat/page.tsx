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
import { NexiaAvatar } from "@/shared/ui/AIIcons";
import { AlertCircle } from "lucide-react";

function ThinkingIndicator() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      transition={{ type: "spring", stiffness: 300, damping: 28 }}
      className="flex w-full items-center gap-2 pl-0.5"
    >
      <NexiaAvatar size={18} />
      <span className="text-[13px] font-semibold" style={{ color: "var(--text-3)" }}>
        Thinking
      </span>
      {/* The dots are the single, purposeful loading motion. */}
      <span className="flex items-center gap-1">
        <span className="streaming-dot" style={{ animationDelay: "0ms" }} />
        <span className="streaming-dot" style={{ animationDelay: "150ms" }} />
        <span className="streaming-dot" style={{ animationDelay: "300ms" }} />
      </span>
    </motion.div>
  );
}

export default function ChatPage() {
  const [input, setInput] = useState("");
  const { messages, status, sendMessage, regenerate, stop, clear } = useNexiaChat();

  const isBusy = status === "submitted" || status === "streaming";
  const lastMessage = messages.at(-1);
  const lastPart = lastMessage?.role === "assistant" ? lastMessage.parts.at(-1) : undefined;
  // The assistant is "actively writing" only when its message currently ends in a
  // non-empty text part. In every other busy state — before the first token, and
  // crucially during the gaps between tool calls / steps mid-stream — show the
  // thinking row so it never looks frozen. (No avatar duplication: the message's
  // own signature avatar only renders once it has text, when this is hidden.)
  const assistantWriting = lastPart?.type === "text" && !!lastPart.text;
  const showThinking = isBusy && !assistantWriting;

  const submit = (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || isBusy) return;
    sendMessage({ text: trimmed });
    setInput("");
  };

  return (
    <main className="mx-auto flex h-[calc(100dvh-48px)] w-full max-w-3xl flex-col overflow-hidden px-4 pt-3 sm:px-6">
      <ChatHeader onClear={clear} canClear={messages.length > 0} />

      <div className="min-h-0 flex-1">
        <Conversation>
          <ConversationContent className="px-0 sm:px-1">
            {messages.length === 0 ? (
              <ChatEmptyState onPrompt={submit} />
            ) : (
              // No AnimatePresence around the list: the empty state must unmount
              // instantly when the first message arrives, otherwise its centered
              // full-height exit animation displaces the new bubble to mid-screen
              // before snapping it to the top. Each message still animates in on
              // mount; messages are never removed individually.
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

            <AnimatePresence>
              {showThinking && <ThinkingIndicator key="thinking" />}
            </AnimatePresence>

            {status === "error" && (
              <motion.div
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center gap-3 rounded-2xl border px-4 py-3"
                style={{ borderColor: "var(--red-border)", background: "var(--red-bg)" }}
              >
                <AlertCircle size={15} style={{ color: "var(--red)" }} />
                <p className="flex-1 text-[13px] font-semibold" style={{ color: "var(--red)" }}>
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

      <div className="shrink-0 pt-2 pb-3">
        <PromptInput
          onSubmit={(message: PromptInputMessage) => submit(message.text)}
          className="w-full"
        >
          <PromptInputBody>
            <PromptInputTextarea
              value={input}
              placeholder="Ask about your people…"
              onChange={(e) => setInput(e.currentTarget.value)}
              disabled={isBusy}
              className="min-h-[44px] bg-transparent text-[16px] text-(--text-1) placeholder:text-(--text-3)"
            />
          </PromptInputBody>
          <PromptInputFooter>
            <span className="pl-1 text-[11px] font-medium" style={{ color: "var(--text-3)" }}>
              {isBusy
                ? status === "submitted"
                  ? "thinking…"
                  : "responding…"
                : "Shift + Enter for a new line"}
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
