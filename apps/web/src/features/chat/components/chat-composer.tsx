"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useSyncExternalStore } from "react";
import { ArrowUp, Square } from "lucide-react";
import type { ChatStatus } from "ai";
import { cn } from "@/lib/utils";

const MAX_TEXTAREA_HEIGHT = 176; // ~7 lines before it starts scrolling

/** True on touch-first devices, where Enter should make a new line. */
function useCoarsePointer(): boolean {
  return useSyncExternalStore(
    (onChange) => {
      const query = window.matchMedia("(pointer: coarse)");
      query.addEventListener("change", onChange);
      return () => query.removeEventListener("change", onChange);
    },
    () => window.matchMedia("(pointer: coarse)").matches,
    () => false
  );
}

/**
 * Nexia's chat composer. On a keyboard, Enter sends and Shift+Enter makes a
 * new line. On a phone there is no Shift+Enter, so Enter makes a new line and
 * the send button sends.
 */
export function ChatComposer({
  value,
  onChange,
  onSubmit,
  onStop,
  status,
}: {
  value: string;
  onChange: (value: string) => void;
  onSubmit: (text: string) => void;
  onStop: () => void;
  status: ChatStatus;
}) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const coarse = useCoarsePointer();
  const isBusy = status === "submitted" || status === "streaming";
  const canSend = value.trim().length > 0 && !isBusy;

  const resize = useCallback(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, MAX_TEXTAREA_HEIGHT)}px`;
  }, []);

  useLayoutEffect(resize, [value, resize]);

  // Re-measure once fonts settle and when the viewport rewraps the text.
  useEffect(() => {
    void document.fonts?.ready.then(resize);
    window.addEventListener("resize", resize);
    return () => window.removeEventListener("resize", resize);
  }, [resize]);

  const submit = () => {
    if (canSend) onSubmit(value);
  };

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
      className="composer rounded-2xl border bg-surface transition-colors duration-200"
    >
      <label htmlFor="chat-input" className="sr-only">
        Ask Nexia about your people
      </label>
      <textarea
        id="chat-input"
        ref={textareaRef}
        rows={1}
        value={value}
        placeholder="Ask about your people…"
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey && !coarse && !e.nativeEvent.isComposing) {
            e.preventDefault();
            submit();
          }
        }}
        // 16px keeps iOS Safari from zooming the page on focus.
        className="block w-full resize-none bg-transparent px-4 pt-3.5 text-[16px] leading-[1.5] text-text-1 placeholder:text-text-3"
        style={{ maxHeight: MAX_TEXTAREA_HEIGHT }}
      />

      <div className="flex items-center justify-between gap-3 px-3 pb-2.5 pt-1.5">
        <p className="truncate text-xs font-semibold text-text-3" aria-live="polite">
          {status === "submitted"
            ? "Thinking…"
            : status === "streaming"
              ? "Answering…"
              : coarse
                ? ""
                : "Enter to send · Shift+Enter for a new line"}
        </p>

        {isBusy ? (
          <button
            type="button"
            onClick={onStop}
            aria-label="Stop the reply"
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-surface-2 text-text-2 transition-colors hover:bg-surface-3"
          >
            <Square className="h-3.5 w-3.5 fill-current" aria-hidden="true" />
          </button>
        ) : (
          <button
            type="submit"
            disabled={!canSend}
            aria-label="Send"
            className={cn(
              "flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-peach-line bg-peach text-peach-ink transition-[filter,opacity] hover:brightness-[0.97] disabled:opacity-40"
            )}
          >
            <ArrowUp className="h-4 w-4" strokeWidth={2.5} aria-hidden="true" />
          </button>
        )}
      </div>
    </form>
  );
}
