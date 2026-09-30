"use client";

import { RotateCcw } from "lucide-react";
import BackButton from "@/components/atoms/BackButton";
import Tooltip from "@/components/atoms/Tooltip";
import { NexiaAvatar } from "@/shared/ui/AIIcons";

export function ChatHeader({
  onNewConversation,
  hasConversation,
}: {
  onNewConversation: () => void;
  hasConversation: boolean;
}) {
  return (
    // Tight on a phone: every row of chrome is a row the transcript loses.
    <header className="flex shrink-0 items-center gap-2.5 pb-2.5 sm:gap-3 sm:pb-3">
      <BackButton href="/profiles" className="-ml-1" />
      <NexiaAvatar size={30} tilt={-3} />
      <div className="flex min-w-0 flex-col">
        <h1 className="text-[15px] font-extrabold leading-tight tracking-tight text-text-1">
          Ask Nexia
        </h1>
        <p className="truncate text-xs font-semibold text-text-3">
          Answers only from your slambook
        </p>
      </div>
      {hasConversation && (
        <Tooltip label="New conversation" className="ml-auto">
          <button
            type="button"
            onClick={onNewConversation}
            aria-label="Start a new conversation"
            className="flex h-11 w-11 items-center justify-center rounded-full text-text-3 transition-colors hover:bg-surface-2 hover:text-text-1"
          >
            <RotateCcw className="h-4 w-4" aria-hidden="true" />
          </button>
        </Tooltip>
      )}
    </header>
  );
}
