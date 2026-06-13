"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Trash2, MessageSquare } from "lucide-react";
import { NexiaIcon, StickerSparkle } from "@/shared/ui/AIIcons";
import { motion, AnimatePresence } from "framer-motion";
import { useChat } from "@ai-sdk/react";
import type { UIMessage, UITools, ToolUIPart, DynamicToolUIPart } from "ai";
import { createChatTransport } from "@/features/chat/api";
import {
  Conversation,
  ConversationContent,
  ConversationScrollButton,
} from "@/components/ai-elements/conversation";
import { Message, MessageContent, MessageResponse } from "@/components/ai-elements/message";
import {
  PromptInput,
  type PromptInputMessage,
  PromptInputBody,
  PromptInputTextarea,
  PromptInputFooter,
  PromptInputSubmit,
} from "@/components/ai-elements/prompt-input";
import {
  Tool,
  ToolHeader,
  ToolContent,
  ToolInput,
  ToolOutput,
} from "@/components/ai-elements/tool";

const SUGGESTED_PROMPTS = [
  "Who are my oldest friends?",
  "Who shares my zodiac sign?",
  "Tell me something interesting about someone.",
  "Recommend a song based on my friends' tastes.",
];

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 12)
    return "Good morning! Your people are all here — ask me anything about them.";
  if (hour >= 12 && hour < 17)
    return "Hey! I've got all your profiles loaded up. What do you want to know?";
  if (hour >= 17 && hour < 21)
    return "Evening! I've been keeping tabs on your people. Ask me anything.";
  return "Late night Nexia session? I'm here. Ask me about anyone in your slambook.";
}

function toolLabel(toolName: string): string {
  const labels: Record<string, string> = {
    ragSearch: "Searching memories",
    searchProfiles: "Searching profiles",
    getProfile: "Finding profile",
    listProfiles: "Listing profiles",
    createProfile: "Creating profile",
    updateProfile: "Updating profile",
  };
  return labels[toolName] ?? `Running ${toolName}`;
}

function toolTitle(name: string, state: string): string {
  const label = toolLabel(name);
  if (state === "output-available") return `${label} complete`;
  if (state === "output-error") return `${label} failed`;
  return label;
}

export default function ChatPage() {
  const [input, setInput] = useState("");
  const greeting = getGreeting();
  const greetingId = "greeting";

  const { messages, status, sendMessage, regenerate, setMessages } = useChat<UIMessage>({
    transport: createChatTransport(),
    messages: [
      {
        id: greetingId,
        role: "assistant" as const,
        parts: [{ type: "text" as const, text: greeting }],
      },
    ],
  });

  const handleSubmit = (message: PromptInputMessage) => {
    if (!message.text.trim() || status === "streaming" || status === "submitted") return;
    sendMessage({ text: message.text });
    setInput("");
  };

  const clearChat = () => {
    setMessages([
      {
        id: String(Date.now()),
        role: "assistant" as const,
        parts: [
          { type: "text" as const, text: "Chat cleared. What else can I help you discover?" },
        ],
      },
    ]);
  };

  const isStreaming = status === "streaming" || status === "submitted";
  const isEmpty = messages.length === 1 && messages[0]?.id === greetingId;

  return (
    <main
      className="fixed inset-x-0 bottom-0 mx-auto flex max-w-3xl flex-col overflow-hidden px-4 py-4"
      style={{ top: "48px", background: "var(--bg)" }}
    >
      {/* Header */}
      <motion.header
        initial={{ opacity: 0, y: -16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 220, damping: 26 }}
        className="relative mb-3 flex shrink-0 items-center justify-between overflow-hidden rounded-2xl border px-5 py-3 glass-panel"
      >
        <div className="washi-tape-accent w-20" style={{ opacity: 0.8 }} />
        <div className="flex items-center gap-3">
          <Link
            href="/profiles"
            prefetch
            className="rounded-lg p-1.5 transition-colors hover:bg-(--fill-hover)"
            style={{ color: "var(--text-3)" }}
          >
            <ArrowLeft size={16} />
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
          className="rounded-xl p-2 transition-all duration-200 hover:rotate-12 hover:bg-(--fill-hover)"
          style={{ color: "var(--text-3)" }}
        >
          <Trash2 size={16} />
        </button>
      </motion.header>

      {/* Conversation */}
      <div className="min-h-0 flex-1">
        <Conversation>
          <ConversationContent>
            <AnimatePresence initial={false}>
              {isEmpty && (
                <motion.div
                  key="empty"
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.96 }}
                  transition={{ type: "spring", stiffness: 220, damping: 26 }}
                  className="flex flex-col items-center justify-center py-8 text-center"
                >
                  <div
                    className="mb-5 flex h-16 w-16 items-center justify-center rounded-2xl border floating"
                    style={{
                      background: "var(--fill-hover)",
                      borderColor: "var(--border)",
                      transform: "rotate(-3deg)",
                      boxShadow: "3px 3px 0 var(--border-mid)",
                    }}
                  >
                    <StickerSparkle size={32} className="text-(--blue)" />
                  </div>
                  <h2 className="mb-1.5 text-lg font-bold" style={{ color: "var(--text-1)" }}>
                    What do you want to know?
                  </h2>
                  <p
                    className="mb-8 max-w-xs text-sm leading-relaxed"
                    style={{ color: "var(--text-3)" }}
                  >
                    I search through all your profiles to give you accurate insights.
                  </p>
                  <div className="grid w-full max-w-lg grid-cols-1 gap-2 sm:grid-cols-2">
                    {SUGGESTED_PROMPTS.map((prompt) => (
                      <button
                        key={prompt}
                        onClick={() => sendMessage({ text: prompt })}
                        className="group flex items-center justify-between rounded-xl border px-4 py-3 text-left text-xs transition-all active:scale-[0.97] hover:bg-(--fill-hover)"
                        style={{
                          background: "var(--fill)",
                          borderColor: "var(--border)",
                          color: "var(--text-2)",
                        }}
                      >
                        <span className="leading-snug">{prompt}</span>
                        <MessageSquare
                          size={12}
                          className="ml-2 shrink-0 opacity-0 transition-opacity group-hover:opacity-50"
                        />
                      </button>
                    ))}
                  </div>
                </motion.div>
              )}

              {messages.map((message) => (
                <motion.div
                  key={message.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ type: "spring", stiffness: 220, damping: 26 }}
                >
                  {message.parts.map((part, i) => {
                    // Tool parts — check type directly
                    if (part.type === "dynamic-tool" || part.type.startsWith("tool-")) {
                      const toolPart = part as ToolUIPart<UITools> | DynamicToolUIPart;
                      const toolName =
                        toolPart.type === "dynamic-tool"
                          ? toolPart.toolName
                          : toolPart.type.slice(5);
                      const isDone = toolPart.state === "output-available";
                      const isError = toolPart.state === "output-error";

                      return (
                        <div key={`${message.id}-${i}`} className="px-1 py-0.5">
                          <Tool defaultOpen={isDone || isError}>
                            {toolPart.type === "dynamic-tool" ? (
                              <ToolHeader
                                type={toolPart.type}
                                state={toolPart.state}
                                toolName={toolPart.toolName}
                                title={toolTitle(toolName, toolPart.state)}
                              />
                            ) : (
                              <ToolHeader
                                type={toolPart.type}
                                state={toolPart.state}
                                title={toolTitle(toolName, toolPart.state)}
                              />
                            )}
                            <ToolContent>
                              {toolPart.input != null && <ToolInput input={toolPart.input} />}
                              {isDone && toolPart.output != null && (
                                <ToolOutput output={toolPart.output} errorText={undefined} />
                              )}
                            </ToolContent>
                          </Tool>
                        </div>
                      );
                    }

                    // Text parts
                    if (part.type === "text") {
                      return (
                        <Message from={message.role} key={`${message.id}-${i}`}>
                          <MessageContent>
                            <MessageResponse>{part.text}</MessageResponse>
                          </MessageContent>
                        </Message>
                      );
                    }

                    // Other parts (reasoning, source, file, etc.) — skip for now
                    return null;
                  })}
                </motion.div>
              ))}

              {/* Error */}
              {status === "error" && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="mx-auto mt-4 rounded-xl border px-4 py-3 text-center text-xs"
                  style={{
                    borderColor: "var(--red-border)",
                    background: "var(--red-bg)",
                    color: "var(--red)",
                  }}
                >
                  <p className="mb-1 font-semibold">Something went wrong</p>
                  <button onClick={() => regenerate()} className="underline hover:no-underline">
                    Try again
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </ConversationContent>
          <ConversationScrollButton />
        </Conversation>
      </div>

      {/* Input */}
      <div className="shrink-0 pt-3">
        <PromptInput onSubmit={handleSubmit} className="w-full">
          <PromptInputBody>
            <PromptInputTextarea
              value={input}
              placeholder="ask about someone's favorites, memories, or vibes…"
              onChange={(e) => setInput(e.currentTarget.value)}
              disabled={isStreaming}
              className="min-h-[48px] rounded-2xl border-(--border) bg-(--fill-hover) text-(--text-1) placeholder:text-(--text-3)"
            />
          </PromptInputBody>
          <PromptInputFooter>
            <PromptInputSubmit
              status={status === "streaming" ? "streaming" : "ready"}
              disabled={!input.trim() || isStreaming}
            />
          </PromptInputFooter>
        </PromptInput>
      </div>
    </main>
  );
}
