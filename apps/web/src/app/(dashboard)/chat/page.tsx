"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { AlertCircle } from "lucide-react";
import {
  Conversation,
  ConversationContent,
  ConversationScrollButton,
} from "@/components/ai-elements/conversation";
import Button from "@/components/atoms/Button";
import ConfirmDialog from "@/components/molecules/ConfirmDialog";
import { useNexiaChat } from "@/features/chat/chat-provider";
import { describeChatError } from "@/features/chat/lib/errors";
import { ChatComposer } from "@/features/chat/components/chat-composer";
import { ChatHeader } from "@/features/chat/components/chat-header";
import { ChatEmptyState } from "@/features/chat/components/chat-empty-state";
import { ChatMessage } from "@/features/chat/components/chat-message";
import { NexiaAvatar } from "@/shared/ui/AIIcons";
import { EASE_OUT, enter } from "@/shared/ui/motion";

function ThinkingIndicator() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3, ease: EASE_OUT }}
      className="flex w-full items-center gap-2 pl-0.5"
    >
      <NexiaAvatar size={18} />
      <span className="text-[13px] font-bold text-text-3">Thinking</span>
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
  const [confirmingNew, setConfirmingNew] = useState(false);
  const {
    messages,
    status,
    error,
    sendMessage,
    regenerate,
    stop,
    clear,
    addToolApprovalResponse,
    clearError,
  } = useNexiaChat();

  // Chat is the one screen that owns the viewport: see `.app-screen` in
  // globals.css for why sizing the column to 100dvh alone is not enough.
  useEffect(() => {
    document.documentElement.classList.add("app-screen");
    document.title = "Ask Nexia | Nexia";
    return () => document.documentElement.classList.remove("app-screen");
  }, []);

  const isBusy = status === "submitted" || status === "streaming";
  const lastMessage = messages.at(-1);
  const lastPart = lastMessage?.role === "assistant" ? lastMessage.parts.at(-1) : undefined;
  // "Thinking" shows whenever the reply is busy but not visibly writing text,
  // including the gaps between tool calls, so it never looks frozen.
  const assistantWriting = lastPart?.type === "text" && !!lastPart.text;
  const showThinking = isBusy && !assistantWriting;
  const problem = status === "error" ? describeChatError(error) : null;

  const submit = (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || isBusy) return;
    if (status === "error") clearError();
    void sendMessage({ text: trimmed });
    setInput("");
  };

  return (
    <main
      id="main"
      className="mx-auto flex w-full flex-col overflow-hidden px-(--gutter) pt-2 sm:pt-3"
      // The `reading` shell's width and gutters, plus the viewport height.
      style={{
        height: "calc(100dvh - var(--navbar-h))",
        maxWidth: "calc(var(--shell-reading) + var(--gutter) * 2)",
      }}
    >
      <ChatHeader
        hasConversation={messages.length > 0}
        onNewConversation={() => setConfirmingNew(true)}
      />

      <div className="min-h-0 flex-1">
        <Conversation>
          <ConversationContent className="px-0">
            {messages.length === 0 ? (
              <ChatEmptyState onPrompt={submit} />
            ) : (
              messages.map((message) => (
                <motion.div key={message.id} {...enter(0, 8)}>
                  <ChatMessage
                    message={message}
                    onApproval={(id, approved) => void addToolApprovalResponse({ id, approved })}
                  />
                </motion.div>
              ))
            )}

            <AnimatePresence>
              {showThinking && <ThinkingIndicator key="thinking" />}
            </AnimatePresence>

            {problem && (
              <motion.div
                role="alert"
                {...enter(0, 4)}
                className="flex flex-wrap items-center gap-x-3 gap-y-2 rounded-2xl border border-red-border bg-red-bg px-4 py-3"
              >
                <AlertCircle className="h-4 w-4 shrink-0 text-red-ink" aria-hidden="true" />
                <p className="min-w-0 flex-1 text-[13px] font-semibold leading-snug text-red-ink">
                  {problem.message}
                </p>
                {problem.retry ? (
                  <Button variant="ghost" size="sm" onClick={() => void regenerate()}>
                    Try again
                  </Button>
                ) : (
                  <Button variant="ghost" size="sm" onClick={clear}>
                    New conversation
                  </Button>
                )}
              </motion.div>
            )}
          </ConversationContent>
          <ConversationScrollButton />
        </Conversation>
      </div>

      <div
        className="shrink-0 pt-1.5 sm:pt-2"
        style={{ paddingBottom: "calc(0.625rem + env(safe-area-inset-bottom))" }}
      >
        <ChatComposer
          value={input}
          onChange={setInput}
          onSubmit={submit}
          onStop={stop}
          status={status}
        />
      </div>

      <ConfirmDialog
        isOpen={confirmingNew}
        eyebrow="New conversation"
        title="Start over?"
        description="This conversation will be cleared. Your profiles aren't affected."
        confirmLabel="Start over"
        tone="primary"
        onConfirm={() => {
          if (isBusy) void stop();
          clear();
          setConfirmingNew(false);
        }}
        onCancel={() => setConfirmingNew(false)}
      />
    </main>
  );
}
