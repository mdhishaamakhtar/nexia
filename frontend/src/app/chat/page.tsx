"use client";

import { useState, useRef, useEffect } from "react";
import { Send, User, Bot, Sparkles, Trash2, MessageSquare, Zap } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import api from "@/lib/api";
import Navbar from "@/components/molecules/Navbar";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeRaw from "rehype-raw";

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
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "1",
      role: "assistant",
      content: "Hi! I'm Nexia AI. I've analyzed your friends' profiles—ask me anything about them!",
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [mounted, setMounted] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSubmit = async (e?: React.FormEvent, overrideInput?: string) => {
    e?.preventDefault();
    const finalInput = overrideInput || input;
    if (!finalInput.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: finalInput,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    try {
      const response = await api.post("/chat", { message: userMessage.content });

      const botMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: response.data.response,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, botMessage]);
    } catch (error) {
      console.error("Chat failed:", error);
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content:
          "I'm having trouble retrieving that information right now. Make sure your friends' profiles are synced!",
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const clearChat = () => {
    setMessages([
      {
        id: Date.now().toString(),
        role: "assistant",
        content: "Chat cleared. What else can I help you discover about your friends?",
        timestamp: new Date(),
      },
    ]);
  };

  return (
    <div className="min-h-screen bg-[var(--color-bg)] text-[var(--color-text-primary)] transition-colors duration-500">
      <Navbar />

      <main className="max-w-4xl mx-auto px-4 py-4 h-[calc(100vh-84px)] flex flex-col gap-4">
        {/* Header Area */}
        <div className="flex items-center justify-between glass-panel px-5 py-2.5 rounded-2xl shadow-xl">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-gradient-to-tr from-[var(--color-primary-from)] to-[var(--color-primary-to)] shadow-lg shadow-indigo-500/20">
              <Bot size={22} className="text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold tracking-tight">Nexia Intel</h1>
              <div className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                <p className="text-xs text-[var(--color-text-secondary)] font-medium">
                  RAG Context Active
                </p>
              </div>
            </div>
          </div>
          <button
            onClick={clearChat}
            className="p-2.5 rounded-xl hover:bg-white/5 text-[var(--color-text-secondary)] hover:text-rose-400 transition-all duration-300"
            title="Clear Chat"
          >
            <Trash2 size={20} />
          </button>
        </div>

        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto space-y-6 px-2 py-4 scrollbar-thin">
          <AnimatePresence initial={false}>
            {messages.length === 1 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex flex-col items-center justify-center py-12 text-center"
              >
                <div className="w-16 h-16 rounded-3xl bg-white/5 flex items-center justify-center mb-6 border border-white/10">
                  <Zap size={32} className="text-[var(--color-primary-from)]" />
                </div>
                <h2 className="text-2xl font-bold mb-3">Ask about your friends</h2>
                <p className="text-[var(--color-text-secondary)] max-w-sm mb-10 leading-relaxed">
                  I search through all your friend profiles to give you accurate insights and help
                  you remember the details.
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 w-full max-w-2xl">
                  {SUGGESTED_PROMPTS.map((prompt, i) => (
                    <button
                      key={i}
                      onClick={() => handleSubmit(undefined, prompt)}
                      className="px-5 py-4 rounded-xl border border-white/5 bg-white/[0.02] hover:bg-white/[0.05] hover:border-white/10 text-sm text-[var(--color-text-secondary)] transition-all text-left flex items-center justify-between group"
                    >
                      {prompt}
                      <MessageSquare
                        size={14}
                        className="opacity-0 group-hover:opacity-100 transition-opacity"
                      />
                    </button>
                  ))}
                </div>
              </motion.div>
            )}

            {messages.map((msg, index) => (
              <motion.div
                key={msg.id}
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                transition={{ duration: 0.4, ease: "easeOut" }}
                className={`flex gap-4 ${msg.role === "user" ? "flex-row-reverse" : "flex-row"}`}
              >
                {/* Avatar */}
                <div
                  className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 shadow-lg ${msg.role === "user"
                    ? "bg-slate-700 text-slate-200"
                    : "bg-gradient-to-tr from-[var(--color-primary-from)] to-[var(--color-primary-to)] text-white"
                    }`}
                >
                  {msg.role === "user" ? <User size={18} /> : <Sparkles size={18} />}
                </div>

                <div
                  className={`max-w-[85%] px-5 py-4 rounded-2xl shadow-lg ${msg.role === "user"
                    ? "bg-[var(--color-surface-highlight)] border border-white/10 text-[var(--color-text-primary)] rounded-tr-none text-sm"
                    : "bg-[var(--color-surface)] border border-white/10 text-[var(--color-text-primary)] rounded-tl-none text-sm leading-relaxed"
                    }`}
                >
                  <div
                    className="prose prose-invert prose-sm max-w-none 
                                        prose-p:leading-relaxed prose-p:my-3
                                        prose-headings:text-white prose-headings:font-bold prose-headings:my-4
                                        prose-pre:bg-black/50 prose-pre:border prose-pre:border-white/10 prose-pre:p-4 prose-pre:rounded-xl
                                        prose-code:text-indigo-300 prose-code:bg-indigo-500/10 prose-code:px-1.5 prose-code:rounded-md
                                        prose-table:border prose-table:border-white/10 prose-table:rounded-xl prose-table:overflow-hidden prose-table:my-6
                                        prose-th:bg-white/10 prose-th:px-4 prose-th:py-2 prose-th:text-white prose-th:text-sm
                                        prose-td:px-4 prose-td:py-2 prose-td:border-t prose-td:border-white/5 prose-td:text-sm
                                        prose-ul:list-disc prose-ul:my-4 prose-ul:pl-6 prose-ul:space-y-2
                                        prose-ol:list-decimal prose-ol:my-4 prose-ol:pl-6 prose-ol:space-y-2
                                        prose-li:leading-relaxed"
                  >
                    <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeRaw]}>
                      {msg.content}
                    </ReactMarkdown>
                  </div>
                  <span className="text-[10px] opacity-30 mt-3 block text-right font-sans font-light tracking-wider uppercase">
                    {mounted ? msg.timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : ""}
                  </span>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>

          {isLoading && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex gap-4 animate-pulse"
            >
              <div className="w-10 h-10 rounded-2xl bg-white/5 flex items-center justify-center shrink-0 border border-white/10">
                <Bot size={18} className="text-[var(--color-text-secondary)]" />
              </div>
              <div className="bg-white/5 border border-white/10 rounded-2xl rounded-tl-none px-6 py-4 flex items-center gap-2">
                <div
                  className="w-1.5 h-1.5 rounded-full bg-[var(--color-primary-from)] animate-bounce"
                  style={{ animationDelay: "0ms" }}
                />
                <div
                  className="w-1.5 h-1.5 rounded-full bg-[var(--color-primary-from)] animate-bounce"
                  style={{ animationDelay: "150ms" }}
                />
                <div
                  className="w-1.5 h-1.5 rounded-full bg-[var(--color-primary-from)] animate-bounce"
                  style={{ animationDelay: "300ms" }}
                />
              </div>
            </motion.div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div className="relative pt-2">
          <form onSubmit={handleSubmit} className="relative group">
            {/* Glow effect */}
            <div className="absolute -inset-1 bg-gradient-to-r from-[var(--color-primary-from)] to-[var(--color-primary-to)] rounded-2xl opacity-0 group-focus-within:opacity-10 transition duration-500 blur-lg"></div>

            <div className="relative flex items-center glass-panel px-2 rounded-2xl border border-white/10 focus-within:border-[var(--color-primary-from)]/40 transition-all duration-300">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask about someone's hobbies, secrets, or zodiac sign..."
                className="w-full bg-transparent px-5 py-4 text-sm text-[var(--color-text-primary)] placeholder-white/20 focus:outline-none"
                disabled={isLoading}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    handleSubmit(e as any);
                  }
                }}
              />
              <div className="flex gap-2 mr-2">
                <button
                  type="submit"
                  disabled={!input.trim() || isLoading}
                  className="p-3 bg-gradient-to-tr from-[var(--color-primary-from)] to-[var(--color-primary-to)] rounded-xl text-white shadow-lg shadow-indigo-500/20 hover:scale-105 active:scale-95 disabled:opacity-50 disabled:scale-100 transition-all"
                >
                  <Send size={18} />
                </button>
              </div>
            </div>
          </form>
          <p className="text-[10px] text-[var(--color-text-secondary)]/50 mt-4 text-center tracking-wide uppercase">
            Nexia AI leverages Profile Embeddings for high-accuracy retrieval
          </p>
        </div>
      </main>
    </div>
  );
}
