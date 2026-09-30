"use client";

import { useState } from "react";
import type { UIMessage } from "ai";
import { Check, Copy } from "lucide-react";
import { MessageResponse } from "@/components/ai-elements/message";
import { isToolPart } from "@/features/chat/lib/tool-meta";
import { chatMarkdownComponents } from "@/features/chat/lib/markdown";
import { NexiaAvatar } from "@/shared/ui/AIIcons";
import { ToolActivity } from "./tool-activity";

export function ChatMessage({
  message,
  onApproval,
}: {
  message: UIMessage;
  onApproval: (id: string, approved: boolean) => void;
}) {
  if (message.role === "assistant")
    return <AssistantMessage message={message} onApproval={onApproval} />;
  return <UserMessage message={message} />;
}

function AssistantMessage({
  message,
  onApproval,
}: {
  message: UIMessage;
  onApproval: (id: string, approved: boolean) => void;
}) {
  const text = message.parts
    .filter((p): p is Extract<typeof p, { type: "text" }> => p.type === "text" && !!p.text)
    .map((p) => p.text)
    .join("\n\n");

  return (
    <div className="group/msg w-full">
      <div className="flex min-w-0 flex-col gap-2.5">
        {message.parts.map((part, i) => {
          if (part.type === "text" && part.text) {
            return (
              <div
                key={`${message.id}-text-${i}`}
                className="chat-markdown text-[15px] leading-[1.7] text-text-1"
              >
                <MessageResponse components={chatMarkdownComponents}>{part.text}</MessageResponse>
              </div>
            );
          }
          if (isToolPart(part)) {
            return (
              <ToolActivity key={`${message.id}-tool-${i}`} part={part} onApproval={onApproval} />
            );
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
      // Clipboard can be unavailable (an insecure context); fail quietly.
    }
  };

  return (
    <div className="mt-2 flex items-center gap-2">
      <NexiaAvatar size={18} />
      <span className="text-[11px] font-bold tracking-tight text-text-3">Nexia</span>
      <button
        type="button"
        onClick={copy}
        aria-label={copied ? "Copied" : "Copy reply"}
        className="hit-44 flex h-7 w-7 items-center justify-center rounded-lg text-text-3 opacity-70 transition-[opacity,background-color] hover:bg-surface-2 hover:opacity-100 focus-visible:opacity-100 sm:opacity-0 sm:group-hover/msg:opacity-100"
      >
        {copied ? (
          <Check className="h-3.5 w-3.5 text-green-ink" aria-hidden="true" />
        ) : (
          <Copy className="h-3.5 w-3.5" aria-hidden="true" />
        )}
      </button>
    </div>
  );
}

/** Your own words, as you typed them: plain text, not rendered as markdown. */
function UserMessage({ message }: { message: UIMessage }) {
  const text = message.parts
    .filter(
      (part): part is Extract<typeof part, { type: "text" }> => part.type === "text" && !!part.text
    )
    .map((p) => p.text)
    .join("\n\n");
  if (!text) return null;

  return (
    <div className="flex w-full justify-end pl-10">
      <p className="max-w-[78%] whitespace-pre-wrap break-words rounded-[20px] rounded-br-md bg-peach px-4 py-2.5 text-[15px] leading-[1.6] text-peach-ink">
        {text}
      </p>
    </div>
  );
}
