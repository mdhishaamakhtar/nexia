"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Send, User, Trash2, MessageSquare, ArrowLeft } from "lucide-react";
import { NexiaIcon, StickerSparkle } from "@/shared/ui/AIIcons";
import { motion, AnimatePresence } from "framer-motion";
import ReactMarkdown from "react-markdown";
import { useMutation } from "@tanstack/react-query";
import remarkGfm from "remark-gfm";
import { sendChatMessage } from "@/features/chat/api";
import { useToast } from "@/shared/ui/toast";
import { getErrorMessage } from "@/shared/api/client";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

const SUGGESTED_PROMPTS = [
  "Who are my oldest friends?",
  "Who shares my zodiac sign?",
  "Tell me something interesting about someone.",
  "Recommend a song based on my friends' tastes.",
];

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 12) {
    return "Good morning! Your people are all here — ask me anything about them.";
  }
  if (hour >= 12 && hour < 17) {
    return "Hey! I've got all your profiles loaded up. What do you want to know?";
  }
  if (hour >= 17 && hour < 21) {
    return "Evening! I've been keeping tabs on your people. Ask me anything.";
  }
  return "Late night Nexia session? I'm here. Ask me about anyone in your slambook.";
}

export default function ChatPage() {
  const { error: showError } = useToast();
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "1",
      role: "assistant",
      content: getGreeting(),
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messageIdRef = useRef(2);

  const chatMutation = useMutation({ mutationFn: sendChatMessage });

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSubmit = async (e?: React.FormEvent, overrideInput?: string) => {
    e?.preventDefault();
    const finalInput = overrideInput || input;
    if (!finalInput.trim() || chatMutation.isPending) return;
    const nextId = () => String(messageIdRef.current++);

    const userMessage: Message = {
      id: nextId(),
      role: "user",
      content: finalInput,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");

    try {
      const response = await chatMutation.mutateAsync(userMessage.content);
      setMessages((prev) => [
        ...prev,
        {
          id: nextId(),
          role: "assistant",
          content: response.response,
          timestamp: new Date(),
        },
      ]);
    } catch (error: unknown) {
      showError(getErrorMessage(error, "Failed to send message"));
      setMessages((prev) => [
        ...prev,
        {
          id: nextId(),
          role: "assistant",
          content: "I'm having trouble right now. Make sure your friends' profiles are synced!",
          timestamp: new Date(),
        },
      ]);
    }
  };

  const clearChat = () => {
    setMessages([
      {
        id: String(messageIdRef.current++),
        role: "assistant",
        content: "Chat cleared. What else can I help you discover?",
        timestamp: new Date(),
      },
    ]);
  };

  return (
    // Fixed below the navbar — takes the chat out of document flow entirely so the
    // body has nothing to scroll. Sticky navbar (z-50) sits on top.
    <main
      className="fixed inset-x-0 bottom-0 mx-auto flex max-w-3xl flex-col overflow-hidden px-4 py-4"
      style={{ top: "48px", color: "var(--text-1)" }}
    >
      {/* ── Header ── */}
      <motion.header
        initial={{ opacity: 0, y: -16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 220, damping: 26 }}
        className="relative mb-3 flex shrink-0 items-center justify-between overflow-hidden rounded-2xl border px-5 py-3 glass-panel"
        style={{ borderColor: "var(--border)" }}
      >
        <div className="washi-tape-accent w-20" style={{ opacity: 0.8 }} aria-hidden="true" />

        <div className="flex items-center gap-3">
          <Link
            href="/profiles"
            prefetch
            className="rounded-lg p-1.5 transition-colors"
            style={{ color: "var(--text-3)" }}
            aria-label="Back to profiles"
          >
            <ArrowLeft size={16} aria-hidden="true" />
          </Link>
          <div className="rounded-xl p-2" style={{ background: "var(--blue)" }}>
            <NexiaIcon size={20} className="text-white" />
          </div>
          <div>
            <h1 className="text-sm font-bold" style={{ color: "var(--text-1)" }}>
              Ask about your people
            </h1>
            <div className="mt-0.5 flex items-center gap-1.5">
              <span
                className="h-1.5 w-1.5 rounded-full animate-pulse"
                style={{ background: "var(--green)" }}
              />
              <p className="label-caps" style={{ color: "var(--text-3)" }}>
                memories loaded
              </p>
            </div>
          </div>
        </div>

        <button
          onClick={clearChat}
          className="rounded-xl p-2 transition-all duration-200 hover:rotate-12"
          style={{ color: "var(--text-3)" }}
          aria-label="Clear chat"
        >
          <Trash2 size={16} aria-hidden="true" />
        </button>
      </motion.header>

      {/* ── Messages ──
          min-h-0 is required: without it a flex child can't shrink below its content
          height, which breaks overflow-y-auto and causes double scroll.        */}
      <div
        role="log"
        aria-label="Chat messages"
        aria-live="polite"
        className="min-h-0 flex-1 overflow-y-auto px-1"
      >
        <div className="flex flex-col gap-4 py-2">
          <AnimatePresence initial={false}>
            {/* Empty state — shown only when there's just the greeting */}
            {messages.length === 1 && (
              <motion.div
                key="empty"
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.96 }}
                transition={{ type: "spring", stiffness: 220, damping: 26 }}
                className="flex flex-col items-center py-8 text-center"
              >
                <div
                  className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border"
                  style={{
                    background: "var(--fill-hover)",
                    borderColor: "var(--border)",
                    transform: "rotate(-3deg)",
                    boxShadow: "2px 2px 0 var(--border-mid)",
                  }}
                >
                  <StickerSparkle size={28} className="text-(--blue)" />
                </div>
                <h2 className="mb-1.5 text-lg font-bold" style={{ color: "var(--text-1)" }}>
                  What do you want to know?
                </h2>
                <p
                  className="mb-6 max-w-xs text-sm leading-relaxed"
                  style={{ color: "var(--text-3)" }}
                >
                  I search through all your profiles to give you accurate insights.
                </p>
                <div className="grid w-full max-w-lg grid-cols-1 gap-2 sm:grid-cols-2">
                  {SUGGESTED_PROMPTS.map((prompt) => (
                    <button
                      key={prompt}
                      onClick={() => handleSubmit(undefined, prompt)}
                      className="group flex items-center justify-between rounded-xl border px-4 py-3 text-left text-xs transition-all active:scale-[0.97] hover:border-(--border-mid)"
                      style={{
                        background: "var(--fill)",
                        borderColor: "var(--border)",
                        color: "var(--text-2)",
                      }}
                    >
                      {prompt}
                      <MessageSquare
                        size={12}
                        className="ml-2 shrink-0 opacity-0 transition-opacity group-hover:opacity-50"
                        aria-hidden="true"
                      />
                    </button>
                  ))}
                </div>
              </motion.div>
            )}

            {/* Message bubbles */}
            {messages.map((msg) => (
              <motion.div
                key={msg.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ type: "spring", stiffness: 220, damping: 26 }}
                className={`flex items-end gap-2 ${
                  msg.role === "user" ? "flex-row-reverse" : "flex-row"
                }`}
              >
                {/* Avatar */}
                <div
                  className="h-7 w-7 shrink-0 rounded-xl flex items-center justify-center"
                  style={
                    msg.role === "user"
                      ? {
                          background: "var(--fill-hover)",
                          border: "1px solid var(--border-mid)",
                          color: "var(--text-2)",
                        }
                      : { background: "var(--blue)", color: "#fff" }
                  }
                >
                  {msg.role === "user" ? (
                    <User size={14} aria-hidden="true" />
                  ) : (
                    <NexiaIcon size={15} aria-hidden="true" />
                  )}
                </div>

                {/* Bubble */}
                <div
                  className={`max-w-[80%] rounded-2xl border px-4 py-3 text-sm leading-relaxed ${
                    msg.role === "user" ? "rounded-br-sm" : "rounded-bl-sm"
                  }`}
                  style={
                    msg.role === "user"
                      ? {
                          background: "var(--fill-hover)",
                          borderColor: "var(--border-mid)",
                          color: "var(--text-1)",
                        }
                      : {
                          background: "var(--glass)",
                          borderColor: "var(--border)",
                          backdropFilter: "blur(12px)",
                          WebkitBackdropFilter: "blur(12px)",
                          color: "var(--text-1)",
                        }
                  }
                >
                  <div className="chat-markdown">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.content}</ReactMarkdown>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>

          {/* Typing indicator */}
          <AnimatePresence>
            {chatMutation.isPending && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 4 }}
                transition={{ type: "spring", stiffness: 220, damping: 26 }}
                className="flex items-end gap-2"
              >
                <div
                  className="h-7 w-7 shrink-0 rounded-xl flex items-center justify-center"
                  style={{ background: "var(--blue)" }}
                >
                  <NexiaIcon size={15} className="text-white" aria-hidden="true" />
                </div>
                <div
                  className="flex items-center gap-1.5 rounded-2xl rounded-bl-sm border px-4 py-3"
                  style={{
                    background: "var(--glass)",
                    borderColor: "var(--border)",
                    backdropFilter: "blur(12px)",
                    WebkitBackdropFilter: "blur(12px)",
                  }}
                  aria-label="Nexia is thinking"
                >
                  {[0, 150, 300].map((delay) => (
                    <div
                      key={delay}
                      className="h-1.5 w-1.5 rounded-full animate-bounce"
                      style={{
                        background: "var(--blue)",
                        animationDelay: `${delay}ms`,
                      }}
                    />
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* ── Input ── */}
      <div className="shrink-0 pb-1 pt-3">
        <form onSubmit={handleSubmit}>
          <div
            className="flex items-center gap-2 rounded-2xl border px-4 py-2 transition-all duration-200 focus-within:border-(--blue)"
            style={{
              background: "var(--fill-hover)",
              borderColor: "var(--border)",
            }}
          >
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="ask about someone's favorites, memories, or vibes…"
              aria-label="Ask about your people"
              className="min-w-0 flex-1 bg-transparent py-2 text-base sm:text-sm focus:outline-none"
              style={{ color: "var(--text-1)" }}
              disabled={chatMutation.isPending}
            />
            <motion.button
              type="submit"
              disabled={!input.trim() || chatMutation.isPending}
              whileTap={{ scale: 0.88 }}
              transition={{ type: "spring", stiffness: 500, damping: 30 }}
              aria-label="Send message"
              className="shrink-0 rounded-xl p-2 text-white transition-opacity hover:opacity-90 disabled:opacity-30 cursor-pointer"
              style={{ background: "var(--blue)" }}
            >
              <Send size={15} aria-hidden="true" />
            </motion.button>
          </div>
        </form>
      </div>
    </main>
  );
}
