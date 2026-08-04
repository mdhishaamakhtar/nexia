import { useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowUpRight, Check, ChevronDown, Loader2, TriangleAlert } from "lucide-react";
import type { ProfileSummary } from "@nexia/shared";
import {
  extractProfilesFromOutput,
  extractToolError,
  extractWriteResult,
  toolMetaFor,
  toolNameOf,
  type ToolPart,
} from "@/features/chat/lib/tool-meta";
import { ChatProfileCard, ChatProfileList } from "./chat-profile-card";

export function ToolActivity({ part }: { part: ToolPart }) {
  const name = toolNameOf(part);
  const meta = toolMetaFor(name);
  const Icon = meta.icon;

  if (part.state === "input-streaming" || part.state === "input-available") {
    return (
      <span
        className="inline-flex w-fit items-center gap-1.5 rounded-full py-1 pr-3 pl-2.5 text-[12.5px] font-medium"
        style={{ background: "var(--surface-2)", color: "var(--text-3)" }}
      >
        <Loader2 size={12} className="animate-spin" style={{ color: "var(--blue-ink)" }} />
        {meta.active}
        <span className="tool-ellipsis">…</span>
      </span>
    );
  }

  if (part.state === "output-error") {
    return <ErrorLine text={part.errorText ?? "Something went wrong"} />;
  }

  if (part.state === "output-available") {
    const softError = extractToolError(part.output);
    if (softError) return <ErrorLine text={softError} />;

    if (meta.isWrite) {
      const write = extractWriteResult(part.output);
      if (write) {
        return (
          <Link
            href={`/profiles/${write.id}`}
            prefetch
            className="group/write inline-flex w-fit max-w-full items-center gap-2.5 rounded-xl border px-3 py-2 transition-colors hover:bg-(--surface-3)"
            style={{ borderColor: "rgba(34,197,94,0.28)", background: "rgba(34,197,94,0.06)" }}
          >
            <span
              className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg"
              style={{ background: "rgba(34,197,94,0.14)" }}
            >
              <Check size={13} style={{ color: "var(--green-ink)" }} />
            </span>
            <span
              className="min-w-0 truncate text-[13.5px] font-semibold"
              style={{ color: "var(--text-1)" }}
            >
              {meta.done}
              <span className="font-medium" style={{ color: "var(--text-3)" }}>
                {" · "}
              </span>
              {write.fullName}
            </span>
            <ArrowUpRight
              size={14}
              className="shrink-0 opacity-40 transition-opacity group-hover/write:opacity-80"
              style={{ color: "var(--text-3)" }}
            />
          </Link>
        );
      }
    }

    const profiles = extractProfilesFromOutput(name, part.output);
    const [first] = profiles;

    // One hit → show the card directly (it's almost always the answer).
    if (profiles.length === 1 && first) {
      return (
        <div className="w-full max-w-md">
          <ToolCaption icon={Icon} label={meta.done} />
          <ChatProfileCard profile={first} />
        </div>
      );
    }

    // Several hits → collapse them so the thread stays calm.
    if (profiles.length > 1) {
      return <ProfileDisclosure profiles={profiles} label={meta.done} count={profiles.length} />;
    }

    // Quiet, log-like line for tool runs that produced no displayable data.
    return (
      <span
        className="inline-flex w-fit items-center gap-1.5 text-[12px] font-medium"
        style={{ color: "var(--text-3)" }}
      >
        <Icon size={12} />
        {meta.done}
      </span>
    );
  }

  return null;
}

function ToolCaption({ icon: Icon, label }: { icon: typeof Check; label: string }) {
  return (
    <span
      className="mb-1.5 inline-flex items-center gap-1.5 pl-0.5 text-[11px] font-semibold"
      style={{ color: "var(--text-3)" }}
    >
      <Icon size={11} style={{ color: "var(--blue-ink)" }} />
      {label}
    </span>
  );
}

function ProfileDisclosure({
  profiles,
  label,
  count,
}: {
  profiles: ProfileSummary[];
  label: string;
  count: number;
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="w-full max-w-md">
      <button
        onClick={() => setExpanded((v) => !v)}
        className="group/disc inline-flex items-center gap-2 rounded-full py-1 pr-2 pl-1 text-left transition-colors hover:bg-(--surface-2)"
      >
        <span
          className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full"
          style={{ background: "rgba(147,197,253,0.16)" }}
        >
          <Check size={12} style={{ color: "var(--blue-ink)" }} />
        </span>
        <span className="text-[12.5px] font-semibold" style={{ color: "var(--text-2)" }}>
          {label}
        </span>
        <span
          className="rounded-full px-1.5 py-0.5 text-[11px] font-bold tabular-nums"
          style={{ background: "var(--surface-3)", color: "var(--text-3)" }}
        >
          {count}
        </span>
        <motion.span
          animate={{ rotate: expanded ? 180 : 0 }}
          transition={{ duration: 0.2, ease: "easeOut" }}
          className="flex"
        >
          <ChevronDown size={14} style={{ color: "var(--text-3)" }} />
        </motion.span>
      </button>

      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22, ease: "easeOut" }}
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

function ErrorLine({ text }: { text: string }) {
  return (
    <span
      className="inline-flex w-fit max-w-full items-start gap-2 rounded-xl border px-3 py-2 text-[13px] font-medium leading-snug"
      style={{
        background: "var(--red-bg)",
        borderColor: "var(--red-border)",
        color: "var(--red-ink)",
      }}
    >
      <TriangleAlert size={14} className="mt-0.5 shrink-0" />
      {text}
    </span>
  );
}
