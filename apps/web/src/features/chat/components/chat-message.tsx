import type { UIMessage } from "ai";
import { Message, MessageContent, MessageResponse } from "@/components/ai-elements/message";
import { isToolPart } from "@/features/chat/lib/tool-meta";
import { NexiaIcon } from "@/shared/ui/AIIcons";
import { ToolActivity } from "./tool-activity";

export function ChatMessage({ message }: { message: UIMessage }) {
  const textParts = message.parts.filter((part) => part.type === "text");
  const toolParts = message.parts.filter((part) => isToolPart(part));

  const text = textParts
    .map((part) => (part.type === "text" ? part.text : ""))
    .filter(Boolean)
    .join("\n\n");

  const hasText = text.length > 0;
  const hasTools = toolParts.length > 0;

  if (message.role === "assistant") {
    return (
      <div className="flex w-full items-start gap-3">
        <div
          className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-2xl border"
          style={{
            background: "var(--blue)",
            borderColor: "rgba(147,197,253,0.4)",
            boxShadow: "0 2px 8px rgba(147,197,253,0.25)",
          }}
        >
          <NexiaIcon size={18} className="text-white" />
        </div>

        <div className="flex min-w-0 max-w-[calc(100%-3rem)] flex-col gap-2">
          <Message from="assistant">
            {hasText && (
              <MessageContent>
                <MessageResponse>{text}</MessageResponse>
              </MessageContent>
            )}
          </Message>

          {hasTools && (
            <div className="flex flex-wrap items-center gap-1.5 pl-1">
              {toolParts.map((part, i) => (
                <ToolActivity key={`${message.id}-tool-${i}`} part={part} />
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex w-full justify-end">
      <div className="flex max-w-[85%] flex-col gap-2">
        <Message from="user">
          {hasText && (
            <MessageContent>
              <MessageResponse>{text}</MessageResponse>
            </MessageContent>
          )}
        </Message>

        {hasTools && (
          <div className="flex flex-wrap items-center justify-end gap-1.5">
            {toolParts.map((part, i) => (
              <ToolActivity key={`${message.id}-tool-${i}`} part={part} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
