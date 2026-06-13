import type { UIMessage } from "ai";
import { MessageResponse } from "@/components/ai-elements/message";
import { isToolPart } from "@/features/chat/lib/tool-meta";
import { NexiaIcon } from "@/shared/ui/AIIcons";
import { ToolActivity } from "./tool-activity";

export function ChatMessage({ message }: { message: UIMessage }) {
  if (message.role === "assistant") {
    return <AssistantMessage message={message} />;
  }
  return <UserMessage message={message} />;
}

function AssistantMessage({ message }: { message: UIMessage }) {
  const parts = message.parts;

  return (
    <div className="flex w-full items-start gap-3">
      <div
        className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl"
        style={{
          background: "var(--blue)",
          boxShadow: "0 2px 6px rgba(147,197,253,0.25)",
        }}
      >
        <NexiaIcon size={16} className="text-white" />
      </div>

      <div className="flex min-w-0 flex-1 flex-col gap-3">
        {parts.map((part, i) => {
          if (part.type === "text" && part.text) {
            return (
              <div
                key={`${message.id}-text-${i}`}
                className="chat-markdown text-[15px] leading-[1.65]"
                style={{ color: "var(--text-1)" }}
              >
                <MessageResponse>{part.text}</MessageResponse>
              </div>
            );
          }

          if (isToolPart(part)) {
            return (
              <div key={`${message.id}-tool-${i}`} className="my-1">
                <ToolActivity part={part} />
              </div>
            );
          }

          return null;
        })}
      </div>
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
    <div className="flex w-full justify-end">
      <div
        className="max-w-[70%] rounded-2xl rounded-tr-sm px-5 py-3"
        style={{
          background: "var(--peach)",
          color: "var(--peach-text)",
        }}
      >
        <div className="chat-markdown text-[15px] leading-[1.6]">
          <MessageResponse>{text}</MessageResponse>
        </div>
      </div>
    </div>
  );
}
