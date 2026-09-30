"use client";

import { useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowUpRight, Check, ChevronDown, Loader2, TriangleAlert, X } from "lucide-react";
import type { ProfileSummary } from "@nexia/shared";
import { cn } from "@/lib/utils";
import { EASE_OUT } from "@/shared/ui/motion";
import {
  extractProfilesFromOutput,
  extractToolError,
  extractWriteResult,
  isWriteTool,
  toolMetaFor,
  toolNameOf,
  type ToolPart,
} from "@/features/chat/lib/tool-meta";
import { ChatProfileCard, ChatProfileList } from "./chat-profile-card";
import { WriteProposal } from "./write-proposal";

/** A quiet one-line note in the thread: what a tool did, or didn't. */
function Note({
  icon,
  children,
  tone = "quiet",
}: {
  icon: React.ReactNode;
  children: React.ReactNode;
  tone?: "quiet" | "error";
}) {
  return (
    <span
      className={cn(
        "inline-flex w-fit max-w-full items-start gap-2 text-[13px] font-semibold leading-snug",
        tone === "error"
          ? "rounded-xl border border-red-border bg-red-bg px-3 py-2 text-red-ink"
          : "text-text-3"
      )}
    >
      <span className="mt-0.5 shrink-0">{icon}</span>
      {children}
    </span>
  );
}

export function ToolActivity({
  part,
  onApproval,
}: {
  part: ToolPart;
  onApproval: (id: string, approved: boolean) => void;
}) {
  const name = toolNameOf(part);
  const meta = toolMetaFor(name);
  const Icon = meta.icon;
  const isWrite = isWriteTool(part);

  if (
    isWrite &&
    part.state !== "output-available" &&
    part.state !== "output-error" &&
    part.state !== "output-denied"
  ) {
    if (part.state === "approval-responded" && !part.approval.approved) {
      return <Note icon={<X className="h-3.5 w-3.5" aria-hidden="true" />}>Not saved</Note>;
    }
    return (
      <WriteProposal
        kind={name === "createProfile" ? "create" : "update"}
        input={part.input}
        state={part.state}
        onRespond={(approved) => {
          if (part.state === "approval-requested") onApproval(part.approval.id, approved);
        }}
      />
    );
  }

  switch (part.state) {
    case "input-streaming":
    case "input-available":
    case "approval-requested":
    case "approval-responded":
      return (
        <Note
          icon={<Loader2 className="h-3.5 w-3.5 animate-spin text-blue-ink" aria-hidden="true" />}
        >
          {meta.active}…
        </Note>
      );
    case "output-denied":
      return <Note icon={<X className="h-3.5 w-3.5" aria-hidden="true" />}>Not saved</Note>;
    case "output-error":
      return (
        <Note tone="error" icon={<TriangleAlert className="h-3.5 w-3.5" aria-hidden="true" />}>
          {isWrite ? "That couldn't be saved." : "That lookup failed."}
        </Note>
      );
  }

  const softError = extractToolError(part.output);
  if (softError) {
    return (
      <Note tone="error" icon={<TriangleAlert className="h-3.5 w-3.5" aria-hidden="true" />}>
        {softError}
      </Note>
    );
  }

  if (isWrite) {
    const write = extractWriteResult(part.output);
    if (!write) return null;
    return (
      <Link
        href={`/profiles/${write.id}`}
        className="group/write inline-flex w-fit max-w-full items-center gap-2.5 rounded-xl border border-green-line bg-green-soft px-3 py-2 transition-colors hover:border-green-ink"
      >
        <Check className="h-4 w-4 shrink-0 text-green-ink" aria-hidden="true" />
        <span className="min-w-0 truncate text-sm font-semibold text-text-1">
          {meta.done} <span className="text-text-2">{write.fullName}</span>
        </span>
        <ArrowUpRight
          className="h-3.5 w-3.5 shrink-0 text-text-3 group-hover/write:text-text-1"
          aria-hidden="true"
        />
      </Link>
    );
  }

  const profiles = extractProfilesFromOutput(name, part.output);
  const [first] = profiles;

  // One hit → show the card directly (it's almost always the answer).
  if (profiles.length === 1 && first) {
    return (
      <div className="w-full max-w-md">
        <p className="mb-1.5 inline-flex items-center gap-1.5 pl-0.5 text-xs font-semibold text-text-3">
          <Icon className="h-3 w-3 text-blue-ink" aria-hidden="true" />
          {meta.done}
        </p>
        <ChatProfileCard profile={first} />
      </div>
    );
  }

  // Several hits → collapsed, so the thread stays calm.
  if (profiles.length > 1) return <ProfileDisclosure profiles={profiles} label={meta.done} />;

  return (
    <Note icon={<Icon className="h-3.5 w-3.5" aria-hidden="true" />}>
      {meta.done}: nothing found
    </Note>
  );
}

function ProfileDisclosure({ profiles, label }: { profiles: ProfileSummary[]; label: string }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="w-full max-w-md">
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        aria-expanded={expanded}
        className="inline-flex min-h-11 items-center gap-2 rounded-full py-1 pl-1 pr-3 text-left transition-colors hover:bg-surface-2"
      >
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-blue-soft">
          <Check className="h-3.5 w-3.5 text-blue-ink-deep" aria-hidden="true" />
        </span>
        <span className="text-[13px] font-semibold text-text-2">
          {label} · {profiles.length} people
        </span>
        <ChevronDown
          className={cn(
            "h-4 w-4 text-text-3 transition-transform duration-200",
            expanded && "rotate-180"
          )}
          aria-hidden="true"
        />
      </button>

      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22, ease: EASE_OUT }}
            className="overflow-hidden"
          >
            <div className="pt-2">
              <ChatProfileList profiles={profiles} max={6} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
