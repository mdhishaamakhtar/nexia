"use client";

import { RotateCcw } from "lucide-react";
import BackButton from "@/components/atoms/BackButton";
import { LogoMark } from "@/components/atoms/Logo";
import Tooltip from "@/components/atoms/Tooltip";

export function ChatHeader({
  onNewConversation,
  hasConversation,
}: {
  onNewConversation: () => void;
  hasConversation: boolean;
}) {
  return (
    // Tight on a phone: every row of chrome is a row the transcript loses.
    <header className="flex shrink-0 items-center gap-3 pb-2.5 sm:pb-3">
      <BackButton href="/profiles" />
      <LogoMark size={32} />
      <div className="flex min-w-0 flex-col">
        <h1 className="text-lg font-bold leading-tight tracking-[-0.02em] text-text-1">
          Ask Nexia
        </h1>
        <p className="truncate text-sm font-medium text-text-3">Answers only from your slambook</p>
      </div>
      {hasConversation && (
        <Tooltip label="New conversation" className="ml-auto">
          <button
            type="button"
            onClick={onNewConversation}
            aria-label="Start a new conversation"
            className="flex h-11 w-11 cursor-pointer items-center justify-center rounded-full bg-surface-2 text-text-1 transition-colors hover:bg-surface-3"
          >
            <RotateCcw className="h-[1.125rem] w-[1.125rem]" aria-hidden="true" />
          </button>
        </Tooltip>
      )}
    </header>
  );
}
