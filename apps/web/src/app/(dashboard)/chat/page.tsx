"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { AlertCircle } from "lucide-react";
import {
  Conversation,
  ConversationContent,
  ConversationScrollButton,
} from "@/components/ai-elements/conversation";
import { useNexiaChat } from "@/features/chat/hooks/use-nexia-chat";
import { ChatComposer } from "@/features/chat/components/chat-composer";
import { ChatHeader } from "@/features/chat/components/chat-header";
import { ChatEmptyState } from "@/features/chat/components/chat-empty-state";
import { ChatMessage } from "@/features/chat/components/chat-message";
import { NexiaAvatar } from "@/shared/ui/AIIcons";

function ThinkingIndicator() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
      className="flex w-full items-center gap-2 pl-0.5"
    >
      <NexiaAvatar size={18} />
      <span className="text-[13px] font-bold" style={{ color: "var(--text-3)" }}>
        Thinking
      </span>
      <span className="flex items-center gap-1" aria-hidden="true">
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
  // The assistant is "actively writing" only when its message currently ends in
  // a non-empty text part. In every other busy state — before the first token,
  // and crucially in the gaps between tool calls mid-stream — show the thinking
  // row so it never looks frozen. No avatar duplication: the message's own
  // signature avatar only renders once it has text, when this is hidden.
  const assistantWriting = lastPart?.type === "text" && !!lastPart.text;
  const showThinking = isBusy && !assistantWriting;

  const submit = (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || isBusy) return;
    sendMessage({ text: trimmed });
    setInput("");
  };

  return (
    // Matches the `reading` shell width and gutters exactly, but can't use
    // PageShell: this column also owns the viewport height so the composer
    // pins to the bottom while only the transcript scrolls.
    <main
      className="mx-auto flex w-full flex-col overflow-hidden px-(--gutter) pt-3"
      style={{
        height: "calc(100dvh - var(--navbar-h))",
        maxWidth: "calc(var(--shell-reading) + var(--gutter) * 2)",
      }}
    >
      <ChatHeader onClear={clear} canClear={messages.length > 0} />

      <div className="min-h-0 flex-1">
        <Conversation>
          <ConversationContent className="px-0">
            {messages.length === 0 ? (
              <ChatEmptyState onPrompt={submit} />
            ) : (
              // No AnimatePresence around the list: the empty state must unmount
              // instantly when the first message arrives, or its centred
              // full-height exit displaces the new bubble to mid-screen before
              // snapping it to the top.
              messages.map((message) => (
                <motion.div
                  key={message.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
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
                role="alert"
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center gap-3 rounded-2xl border px-4 py-3"
                style={{ borderColor: "var(--red-border)", background: "var(--red-bg)" }}
              >
                <AlertCircle size={16} style={{ color: "var(--red-ink)" }} aria-hidden="true" />
                <p className="flex-1 text-[13px] font-bold" style={{ color: "var(--red-ink)" }}>
                  Something went wrong
                </p>
                <button
                  onClick={() => regenerate()}
                  className="rounded-lg px-3 py-2 text-xs font-bold transition-colors hover:bg-(--red-bg-hover)"
                  style={{ color: "var(--red-ink)" }}
                >
                  Retry
                </button>
              </motion.div>
            )}
          </ConversationContent>
          <ConversationScrollButton />
        </Conversation>
      </div>

      <div
        className="shrink-0 pt-2"
        style={{ paddingBottom: "calc(0.75rem + env(safe-area-inset-bottom))" }}
      >
        <ChatComposer
          value={input}
          onChange={setInput}
          onSubmit={submit}
          onStop={stop}
          status={status}
        />
      </div>
    </main>
  );
}
