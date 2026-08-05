"use client";

import { useState } from "react";
import type { UIMessage } from "ai";
import { Check, Copy } from "lucide-react";
import { MessageResponse } from "@/components/ai-elements/message";
import { isToolPart } from "@/features/chat/lib/tool-meta";
import { chatMarkdownComponents } from "@/features/chat/lib/markdown";
import { NexiaAvatar } from "@/shared/ui/AIIcons";
import { ToolActivity } from "./tool-activity";

export function ChatMessage({ message }: { message: UIMessage }) {
  if (message.role === "assistant") {
    return <AssistantMessage message={message} />;
  }
  return <UserMessage message={message} />;
}

function AssistantMessage({ message }: { message: UIMessage }) {
  const parts = message.parts;
  const text = parts
    .filter((p): p is Extract<typeof p, { type: "text" }> => p.type === "text" && !!p.text)
    .map((p) => p.text)
    .join("\n\n");

  return (
    <div className="group/msg w-full">
      <div className="flex min-w-0 flex-col gap-2.5">
        {parts.map((part, i) => {
          if (part.type === "text" && part.text) {
            return (
              <div
                key={`${message.id}-text-${i}`}
                className="chat-markdown text-[15px] leading-[1.7]"
                style={{ color: "var(--text-1)" }}
              >
                <MessageResponse components={chatMarkdownComponents} controls={false}>
                  {part.text}
                </MessageResponse>
              </div>
            );
          }

          if (isToolPart(part)) {
            return <ToolActivity key={`${message.id}-tool-${i}`} part={part} />;
          }

          return null;
        })}
      </div>

      {text && <MessageSignature text={text} />}
    </div>
  );
}

function MessageSignature({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard can be unavailable (insecure context); fail quietly.
    }
  };

  return (
    <div className="mt-2.5 flex items-center gap-2">
      <NexiaAvatar size={18} />
      <span className="text-[11px] font-bold tracking-tight" style={{ color: "var(--text-3)" }}>
        Nexia Intel
      </span>
      <button
        onClick={copy}
        aria-label={copied ? "Copied" : "Copy response"}
        className="flex h-6 w-6 items-center justify-center rounded-lg opacity-60 transition-all hover:bg-(--surface-2) hover:opacity-100 sm:opacity-0 sm:group-hover/msg:opacity-100"
        style={{ color: "var(--text-3)" }}
      >
        {copied ? <Check size={13} style={{ color: "var(--green-ink)" }} /> : <Copy size={13} />}
      </button>
    </div>
  );
}

function UserMessage({ message }: { message: UIMessage }) {
  const textParts = message.parts.filter(
    (part): part is Extract<typeof part, { type: "text" }> => part.type === "text" && !!part.text
  );

  const text = textParts.map((p) => p.text).join("\n\n");
  if (!text) return null;

  return (
    <div className="flex w-full justify-end pl-10">
      <div
        className="max-w-[78%] rounded-[20px] rounded-br-md px-4 py-2.5 text-[15px] leading-[1.6]"
        // No inset highlight. The white top-edge gloss this used to carry was a
        // leftover from the glass era, and The Flat Rule has no "but it's only
        // an inset one" clause — the peach fill is the whole treatment.
        style={{ background: "var(--peach)", color: "var(--peach-ink)" }}
      >
        <div className="chat-markdown">
          <MessageResponse controls={false}>{text}</MessageResponse>
        </div>
      </div>
    </div>
  );
}
