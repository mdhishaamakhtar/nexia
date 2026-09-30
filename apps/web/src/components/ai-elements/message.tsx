"use client";

import { cn } from "@/lib/utils";
import { code } from "@streamdown/code";
import type { ComponentProps } from "react";
import { memo } from "react";
import { Streamdown } from "streamdown";
import type { CodeHighlighterPlugin, PluginConfig } from "streamdown";

/**
 * Streaming markdown for the assistant's replies. Only the code highlighter is
 * loaded: answers about people have no use for diagram, maths or CJK layout
 * engines, and each one was a large download on the one screen that already
 * owns the viewport. Tables and lists are built in.
 *
 * Visual styling lives in the `.chat-markdown` block in globals.css.
 */
export type MessageResponseProps = ComponentProps<typeof Streamdown>;

const streamdownPlugins = {
  // Upstream declaration drift: @streamdown/code types its highlight result as
  // shiki's `TokensResult`, while streamdown declares its own `HighlightResult`
  // that its docs describe as compatible. The runtime shapes agree.
  code: code as unknown as CodeHighlighterPlugin,
} satisfies PluginConfig;

export const MessageResponse = memo(
  ({ className, ...props }: MessageResponseProps) => (
    <Streamdown
      className={cn(
        "chat-markdown size-full text-[15px] leading-relaxed [&>*:first-child]:mt-0 [&>*:last-child]:mb-0",
        className
      )}
      plugins={streamdownPlugins}
      controls={false}
      {...props}
    />
  ),
  (prevProps, nextProps) => prevProps.children === nextProps.children
);

MessageResponse.displayName = "MessageResponse";
