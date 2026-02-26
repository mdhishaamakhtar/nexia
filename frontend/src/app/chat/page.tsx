"use client";

import { useEffect, useRef, useState } from "react";
import { Send, User, Bot, Sparkles, Trash2, MessageSquare, Zap } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import Navbar from "@/components/molecules/Navbar";
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
  "Tell me something interesting about Sarah.",
  "Recommend a song based on my friends' tastes.",
];

export default function ChatPage() {
  const { error: showError } = useToast();
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "1",
      role: "assistant",
      content: "Hi! I'm Nexia AI. I've analyzed your friends' profiles—ask me anything about them!",
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
      showError(getErrorMessage(error, "Failed to send chat message"));
      setMessages((prev) => [
        ...prev,
        {
          id: nextId(),
          role: "assistant",
          content:
            "I'm having trouble retrieving that information right now. Make sure your friends' profiles are synced!",
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
        content: "Chat cleared. What else can I help you discover about your friends?",
        timestamp: new Date(),
      },
    ]);
  };

  return (
    <div className="min-h-screen bg-[var(--color-bg)] text-[var(--color-text-primary)] transition-colors duration-500">
      <Navbar />

      <main className="mx-auto flex h-[calc(100vh-84px)] max-w-4xl flex-col gap-4 px-4 py-4">
        <div className="glass-panel flex items-center justify-between rounded-2xl px-5 py-2.5 shadow-xl">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-gradient-to-tr from-[var(--color-primary-from)] to-[var(--color-primary-to)] p-2.5 shadow-lg shadow-indigo-500/20">
              <Bot size={22} className="text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold tracking-tight">Nexia Intel</h1>
              <div className="flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500"></span>
                <p className="text-xs font-medium text-[var(--color-text-secondary)]">
                  RAG Context Active
                </p>
              </div>
            </div>
          </div>
          <button
            onClick={clearChat}
            className="rounded-xl p-2.5 text-[var(--color-text-secondary)] transition-all duration-300 hover:bg-white/5 hover:text-rose-400"
            title="Clear Chat"
          >
            <Trash2 size={20} />
          </button>
        </div>

        <div className="scrollbar-thin flex-1 space-y-6 overflow-y-auto px-2 py-4">
          <AnimatePresence initial={false}>
            {messages.length === 1 ? (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex flex-col items-center justify-center py-12 text-center"
              >
                <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-3xl border border-white/10 bg-white/5">
                  <Zap size={32} className="text-[var(--color-primary-from)]" />
                </div>
                <h2 className="mb-3 text-2xl font-bold">Ask about your friends</h2>
                <p className="mb-10 max-w-sm leading-relaxed text-[var(--color-text-secondary)]">
                  I search through all your friend profiles to give you accurate insights and help
                  you remember details.
                </p>
                <div className="grid w-full max-w-2xl grid-cols-1 gap-3 md:grid-cols-2">
                  {SUGGESTED_PROMPTS.map((prompt) => (
                    <button
                      key={prompt}
                      onClick={() => handleSubmit(undefined, prompt)}
                      className="group flex items-center justify-between rounded-xl border border-white/5 bg-white/[0.02] px-5 py-4 text-left text-sm text-[var(--color-text-secondary)] transition-all hover:border-white/10 hover:bg-white/[0.05]"
                    >
                      {prompt}
                      <MessageSquare
                        size={14}
                        className="opacity-0 transition-opacity group-hover:opacity-100"
                      />
                    </button>
                  ))}
                </div>
              </motion.div>
            ) : null}

            {messages.map((msg) => (
              <motion.div
                key={msg.id}
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                transition={{ duration: 0.4, ease: "easeOut" }}
                className={`flex gap-4 ${msg.role === "user" ? "flex-row-reverse" : "flex-row"}`}
              >
                <div
                  className={`h-9 w-9 shrink-0 rounded-xl shadow-lg ${
                    msg.role === "user"
                      ? "bg-slate-700 text-slate-200"
                      : "bg-gradient-to-tr from-[var(--color-primary-from)] to-[var(--color-primary-to)] text-white"
                  } flex items-center justify-center`}
                >
                  {msg.role === "user" ? <User size={18} /> : <Sparkles size={18} />}
                </div>

                <div
                  className={`max-w-[85%] rounded-2xl px-5 py-4 text-sm shadow-lg ${
                    msg.role === "user"
                      ? "rounded-tr-none border border-white/10 bg-[var(--color-surface-highlight)] text-[var(--color-text-primary)]"
                      : "rounded-tl-none border border-white/10 bg-[var(--color-surface)] leading-relaxed text-[var(--color-text-primary)]"
                  }`}
                >
                  <div className="prose prose-invert prose-sm max-w-none">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.content}</ReactMarkdown>
                  </div>
                  <span className="mt-3 block text-right font-sans text-[10px] font-light uppercase tracking-wider opacity-30" />
                </div>
              </motion.div>
            ))}
          </AnimatePresence>

          {chatMutation.isPending ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex animate-pulse gap-4"
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-white/5">
                <Bot size={18} className="text-[var(--color-text-secondary)]" />
              </div>
              <div className="flex items-center gap-2 rounded-2xl rounded-tl-none border border-white/10 bg-white/5 px-6 py-4">
                <div className="h-1.5 w-1.5 animate-bounce rounded-full bg-[var(--color-primary-from)]" />
                <div className="h-1.5 w-1.5 animate-bounce rounded-full bg-[var(--color-primary-from)] [animation-delay:150ms]" />
                <div className="h-1.5 w-1.5 animate-bounce rounded-full bg-[var(--color-primary-from)] [animation-delay:300ms]" />
              </div>
            </motion.div>
          ) : null}
          <div ref={messagesEndRef} />
        </div>

        <div className="relative pt-2">
          <form onSubmit={handleSubmit} className="group relative">
            <div className="absolute -inset-1 rounded-2xl bg-gradient-to-r from-[var(--color-primary-from)] to-[var(--color-primary-to)] opacity-0 blur-lg transition duration-500 group-focus-within:opacity-10"></div>

            <div className="glass-panel relative flex items-center rounded-2xl border border-white/10 px-2 transition-all duration-300 focus-within:border-[var(--color-primary-from)]/40">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask about someone's hobbies, secrets, or zodiac sign..."
                className="w-full bg-transparent px-5 py-4 text-sm text-[var(--color-text-primary)] placeholder-white/20 focus:outline-none"
                disabled={chatMutation.isPending}
              />
              <div className="mr-2 flex gap-2">
                <button
                  type="submit"
                  disabled={!input.trim() || chatMutation.isPending}
                  className="rounded-xl bg-gradient-to-tr from-[var(--color-primary-from)] to-[var(--color-primary-to)] p-3 text-white shadow-lg shadow-indigo-500/20 transition-all hover:scale-105 active:scale-95 disabled:scale-100 disabled:opacity-50"
                >
                  <Send size={18} />
                </button>
              </div>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
}
