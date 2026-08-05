"use client";

import { cn } from "@/lib/utils";
import { ArrowDownIcon } from "lucide-react";
import type { ComponentProps } from "react";
import { StickToBottom, useStickToBottomContext } from "use-stick-to-bottom";

export type ConversationProps = ComponentProps<typeof StickToBottom>;

export const Conversation = ({ className, ...props }: ConversationProps) => (
  <StickToBottom
    className={cn("relative h-full overflow-hidden", className)}
    initial="smooth"
    resize="smooth"
    role="log"
    {...props}
  />
);

export type ConversationContentProps = ComponentProps<typeof StickToBottom.Content>;

export const ConversationContent = ({
  className,
  scrollClassName,
  ...props
}: ConversationContentProps) => (
  <StickToBottom.Content
    // min-h-full lets a lone child (the empty state) stretch and centre itself;
    // once there are messages the content simply grows past it.
    className={cn("flex min-h-full flex-col gap-5 py-3 sm:gap-7 sm:py-4", className)}
    // `overscroll-contain` stops a flick that reaches the top or bottom of the
    // transcript from handing the rest of the gesture to whatever is behind it.
    // Paired with the document-scroll lock the chat page applies, a phone has
    // exactly one scrollable surface instead of two competing ones.
    scrollClassName={cn(
      "h-full w-full overflow-auto overscroll-contain scroll-smooth",
      scrollClassName
    )}
    {...props}
  />
);

export type ConversationScrollButtonProps = ComponentProps<"button">;

/**
 * Appears only when the transcript is scrolled away from the bottom.
 * Opaque paper, not the translucent blurred pill it used to be — it sits over
 * running text and needs to be readable rather than atmospheric.
 */
export const ConversationScrollButton = ({
  className,
  ...props
}: ConversationScrollButtonProps) => {
  const { isAtBottom, scrollToBottom } = useStickToBottomContext();

  if (isAtBottom) return null;

  return (
    <button
      type="button"
      onClick={() => scrollToBottom()}
      aria-label="Scroll to latest message"
      className={cn(
        "absolute bottom-4 left-1/2 flex h-9 w-9 -translate-x-1/2 items-center justify-center",
        "rounded-full border transition-colors hover:bg-(--surface-2)",
        className
      )}
      style={{
        background: "var(--surface)",
        borderColor: "var(--border)",
        color: "var(--text-2)",
      }}
      {...props}
    >
      <ArrowDownIcon className="h-4 w-4" aria-hidden="true" />
    </button>
  );
};
