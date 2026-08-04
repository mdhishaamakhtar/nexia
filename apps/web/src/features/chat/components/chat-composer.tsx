"use client";

import { useCallback, useEffect, useLayoutEffect, useRef } from "react";
import { ArrowUp, Square } from "lucide-react";
import type { ChatStatus } from "ai";

const MAX_TEXTAREA_HEIGHT = 176; // ~7 lines before it starts scrolling

/**
 * Nexia's chat composer.
 *
 * This replaces the vendored ai-elements `PromptInput`, which carried ~1,200
 * lines of attachment uploads, screenshot capture, action menus, and model
 * pickers that Nexia's chat has no use for — plus a stack of shadcn primitives
 * whose own token layer fought this app's. Nexia sends text; this sends text.
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
  const isBusy = status === "submitted" || status === "streaming";
  const canSend = value.trim().length > 0 && !isBusy;

  // Grow with content up to a cap, then scroll inside.
  const resize = useCallback(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, MAX_TEXTAREA_HEIGHT)}px`;
  }, []);

  useLayoutEffect(resize, [value, resize]);

  // A single mount measurement isn't trustworthy: measuring before the
  // stylesheet or webfont has applied reads a scrollHeight from unstyled text
  // and locks the box open at max height. Re-measure once fonts settle, and on
  // viewport resize since a narrower box rewraps the text.
  // (A ResizeObserver on the textarea itself would feed back into its own
  // height changes, so this watches the window instead.)
  useEffect(() => {
    void document.fonts?.ready.then(resize);
    window.addEventListener("resize", resize);
    return () => window.removeEventListener("resize", resize);
  }, [resize]);

  const submit = () => {
    if (!canSend) return;
    onSubmit(value);
  };

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
      className="rounded-2xl border transition-colors duration-200"
      style={{
        background: "var(--surface)",
        borderColor: "var(--border)",
      }}
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
          // Enter sends; Shift+Enter is a newline. Never hijack an IME commit.
          if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
            e.preventDefault();
            submit();
          }
        }}
        // 16px prevents iOS Safari from zooming the viewport on focus. The
        // focus ring itself is handled in globals.css (#chat-input), inset so
        // it tracks the field's rounded edge instead of poking past the card.
        className="block w-full resize-none rounded-2xl bg-transparent px-4 pt-3.5 text-[16px] leading-[1.5] placeholder:text-(--text-3)"
        style={{ color: "var(--text-1)", maxHeight: MAX_TEXTAREA_HEIGHT }}
      />

      <div className="flex items-center justify-between gap-3 px-3 pb-3 pt-2">
        <p className="truncate text-[11px] font-semibold" style={{ color: "var(--text-3)" }}>
          {status === "submitted"
            ? "Thinking…"
            : status === "streaming"
              ? "Responding…"
              : "Shift + Enter for a new line"}
        </p>

        {isBusy ? (
          <button
            type="button"
            onClick={onStop}
            aria-label="Stop generating"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition-colors hover:bg-(--surface-3)"
            style={{ background: "var(--surface-2)", color: "var(--text-2)" }}
          >
            <Square className="h-3.5 w-3.5 fill-current" aria-hidden="true" />
          </button>
        ) : (
          <button
            type="submit"
            disabled={!canSend}
            aria-label="Send message"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition-[filter,opacity] hover:brightness-[0.97] disabled:opacity-35"
            style={{ background: "var(--peach)", color: "var(--peach-ink)" }}
          >
            <ArrowUp className="h-4 w-4" strokeWidth={2.5} aria-hidden="true" />
          </button>
        )}
      </div>
    </form>
  );
}
