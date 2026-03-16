"use client";

import { useEffect, useRef, useState } from "react";
import { Send, User, Trash2, MessageSquare, ArrowLeft } from "lucide-react";
import { NexiaIcon, StickerSparkle } from "@/shared/ui/AIIcons";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
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

export default function ChatPage() {
  const router = useRouter();
  const { error: showError } = useToast();
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "1",
      role: "assistant",
      content:
        "Hi! I'm Nexia AI. I've analyzed your friends' profiles — ask me anything about them.",
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
    <main
      className="mx-auto flex h-[calc(100vh-48px)] max-w-3xl flex-col gap-3 px-4 py-4"
      style={{ color: "var(--text-1)" }}
    >
      {/* Chat header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between rounded-2xl px-5 py-3 border relative glass-panel"
        style={{ borderColor: "var(--border)" }}
      >
        <div className="washi-tape-accent w-20" style={{ opacity: 0.8 }} />

        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push("/profiles")}
            className="rounded-lg p-1.5 transition-colors"
            style={{ color: "var(--text-3)" }}
            title="Back"
          >
            <ArrowLeft size={16} />
          </button>
          <div className="rounded-xl p-2" style={{ background: "var(--blue)" }}>
            <NexiaIcon size={20} className="text-white" />
          </div>
          <div>
            <h1 className="text-sm font-bold handwritten" style={{ color: "var(--text-1)" }}>
              Ask about your people
            </h1>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <p
                className="text-[10px] uppercase tracking-wider"
                style={{ color: "var(--text-3)" }}
              >
                memories loaded
              </p>
            </div>
          </div>
        </div>
        <button
          onClick={clearChat}
          className="rounded-xl p-2 transition-all duration-200 hover:rotate-12"
          style={{ color: "var(--text-3)" }}
          title="Clear Chat"
        >
          <Trash2 size={16} />
        </button>
      </motion.div>

      {/* Messages */}
      <div className="flex-1 space-y-5 overflow-y-auto px-1 py-3">
        <AnimatePresence initial={false}>
          {messages.length === 1 && (
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex flex-col items-center justify-center py-10 text-center"
            >
              <div
                className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl border scrapbook-card"
                style={{
                  background: "var(--fill)",
                  borderColor: "var(--border)",
                  transform: "rotate(-3deg)",
                }}
              >
                <StickerSparkle size={28} className="text-(--blue)" />
              </div>
              <h2 className="mb-2 text-xl font-bold handwritten" style={{ color: "var(--text-1)" }}>
                Ask about your people
              </h2>
              <p
                className="mb-8 max-w-xs text-sm leading-relaxed"
                style={{ color: "var(--text-3)" }}
              >
                I search through all your profiles to give you accurate insights.
              </p>
              <div className="grid w-full max-w-xl grid-cols-1 gap-2 sm:grid-cols-2">
                {SUGGESTED_PROMPTS.map((prompt) => (
                  <button
                    key={prompt}
                    onClick={() => handleSubmit(undefined, prompt)}
                    className="group flex items-center justify-between rounded-xl px-4 py-3.5 text-left text-xs border transition-all cursor-pointer active:scale-[0.97]"
                    style={{
                      background: "var(--fill)",
                      borderColor: "var(--border)",
                      color: "var(--text-2)",
                    }}
                  >
                    {prompt}
                    <MessageSquare
                      size={12}
                      className="opacity-0 transition-opacity group-hover:opacity-100 shrink-0 ml-2"
                    />
                  </button>
                ))}
              </div>
            </motion.div>
          )}

          {messages.map((msg, idx) => (
            <motion.div
              key={msg.id}
              initial={{
                opacity: 0,
                x: msg.role === "user" ? 20 : -20,
                rotate: idx % 2 === 0 ? -1 : 1,
              }}
              animate={{ opacity: 1, x: 0, rotate: idx % 2 === 0 ? -0.5 : 0.5 }}
              transition={{ duration: 0.4, ease: "easeOut", type: "spring", stiffness: 100 }}
              className={`flex gap-3 items-end ${msg.role === "user" ? "flex-row-reverse" : "flex-row"}`}
            >
              <div
                className="h-8 w-8 shrink-0 rounded-xl flex items-center justify-center scrapbook-card"
                style={
                  msg.role === "user"
                    ? {
                        background: "var(--fill)",
                        color: "var(--text-2)",
                        transform: "rotate(2deg)",
                      }
                    : { background: "var(--blue)", color: "#ffffff", transform: "rotate(-2deg)" }
                }
              >
                {msg.role === "user" ? <User size={15} /> : <NexiaIcon size={18} />}
              </div>

              <div
                className={`max-w-[85%] rounded-2xl px-4 py-3.5 text-sm border scrapbook-card ${
                  msg.role === "user"
                    ? "rounded-tr-none bg-(--fill-hover)"
                    : "rounded-tl-none bg-white/60 backdrop-blur-md"
                }`}
                style={{
                  borderColor: "var(--border)",
                  color: "var(--text-1)",
                }}
              >
                {msg.role === "assistant" && (
                  <div
                    className="washi-tape-accent w-10 left-4! -top-1!"
                    style={{ opacity: 0.4, background: "var(--peach)" }}
                  />
                )}
                <div className="markdown-content max-w-none leading-relaxed">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.content}</ReactMarkdown>
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {chatMutation.isPending && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex gap-3">
            <div
              className="h-8 w-8 shrink-0 rounded-xl flex items-center justify-center scrapbook-card -rotate-3"
              style={{ background: "var(--blue)" }}
            >
              <NexiaIcon size={18} className="text-white" />
            </div>
            <div
              className="flex items-center gap-1.5 rounded-2xl rounded-tl-none px-5 py-4 border"
              style={{
                background: "var(--fill)",
                borderColor: "var(--border)",
              }}
            >
              <div
                className="h-1.5 w-1.5 animate-bounce rounded-full"
                style={{ background: "var(--blue)" }}
              />
              <div
                className="h-1.5 w-1.5 animate-bounce rounded-full [animation-delay:150ms]"
                style={{ background: "var(--blue)" }}
              />
              <div
                className="h-1.5 w-1.5 animate-bounce rounded-full [animation-delay:300ms]"
                style={{ background: "var(--blue)" }}
              />
            </div>
          </motion.div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="pb-2">
        <form onSubmit={handleSubmit} className="relative">
          <div
            className="flex items-center rounded-2xl border transition-all duration-300 focus-within:border-(--blue)"
            style={{
              background: "var(--fill)",
              borderColor: "var(--border)",
            }}
          >
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="ask about someone's favorites, memories, or vibes..."
              className="w-full bg-transparent px-5 py-4 text-sm focus:outline-none"
              style={{ color: "var(--text-1)" }}
              disabled={chatMutation.isPending}
            />
            <div className="mr-2">
              <motion.button
                type="submit"
                disabled={!input.trim() || chatMutation.isPending}
                whileTap={{ scale: 0.9 }}
                transition={{ type: "spring", stiffness: 500, damping: 30 }}
                className="rounded-xl p-2.5 text-white transition-all hover:opacity-90 disabled:opacity-35 cursor-pointer"
                style={{ background: "var(--blue)" }}
              >
                <Send size={16} />
              </motion.button>
            </div>
          </div>
        </form>
      </div>
    </main>
  );
}
