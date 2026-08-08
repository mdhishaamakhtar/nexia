"use client";

import { cn } from "@/lib/utils";
import { cjk } from "@streamdown/cjk";
import { code } from "@streamdown/code";
import { math } from "@streamdown/math";
import { mermaid } from "@streamdown/mermaid";
import type { ComponentProps } from "react";
import { memo } from "react";
import { Streamdown } from "streamdown";
import type { CodeHighlighterPlugin, PluginConfig } from "streamdown";

/**
 * Streaming markdown renderer for chat.
 *
 * Everything else this file used to vendor from ai-elements — Message,
 * MessageContent, MessageActions, MessageAction, the MessageBranch family,
 * MessageToolbar — was unused: Nexia renders its own bubbles in
 * features/chat/components/chat-message.tsx. Removing them also removed this
 * file's dependency on the shadcn ButtonGroup and Tooltip primitives.
 *
 * Visual styling lives in the `.chat-markdown` block in globals.css.
 */
export type MessageResponseProps = ComponentProps<typeof Streamdown>;

const streamdownPlugins = {
  cjk,
  // Upstream declaration drift: @streamdown/code types its highlight result as
  // shiki's `TokensResult`, while streamdown declares its own `HighlightResult`
  // that its docs describe as "compatible with shiki's TokensResult". The
  // runtime shapes agree; only the .d.ts files disagree. Bridge it here so the
  // mismatch is documented in one place instead of failing the build.
  code: code as unknown as CodeHighlighterPlugin,
  math,
  mermaid,
} satisfies PluginConfig;

export const MessageResponse = memo(
  ({ className, ...props }: MessageResponseProps) => (
    <Streamdown
      className={cn(
        "chat-markdown size-full text-[15px] leading-relaxed [&>*:first-child]:mt-0 [&>*:last-child]:mb-0",
        className
      )}
      plugins={streamdownPlugins}
      {...props}
    />
  ),
  (prevProps, nextProps) => prevProps.children === nextProps.children
);

MessageResponse.displayName = "MessageResponse";
