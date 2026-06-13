import { useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowUpRight, Check, ChevronDown, Loader2, TriangleAlert } from "lucide-react";
import {
  extractProfilesFromOutput,
  extractToolError,
  extractWriteResult,
  toolMetaFor,
  toolNameOf,
  type ToolPart,
} from "@/features/chat/lib/tool-meta";
import { ChatProfileList } from "./chat-profile-card";

export function ToolActivity({ part }: { part: ToolPart }) {
  const name = toolNameOf(part);
  const meta = toolMetaFor(name);
  const Icon = meta.icon;

  if (part.state === "input-streaming" || part.state === "input-available") {
    return (
      <div
        className="inline-flex items-center gap-2 rounded-lg border px-3 py-2"
        style={{
          background: "rgba(147,197,253,0.06)",
          borderColor: "rgba(147,197,253,0.18)",
        }}
      >
        <Loader2 size={14} className="animate-spin" style={{ color: "var(--blue)" }} />
        <span className="text-[13px] font-medium" style={{ color: "var(--text-2)" }}>
          {meta.active}...
        </span>
      </div>
    );
  }

  if (part.state === "output-error") {
    return <ErrorCard text={part.errorText ?? "Something went wrong"} />;
  }

  if (part.state === "output-available") {
    const softError = extractToolError(part.output);
    if (softError) return <ErrorCard text={softError} />;

    if (meta.isWrite) {
      const write = extractWriteResult(part.output);
      if (write) {
        return (
          <Link
            href={`/profiles/${write.id}`}
            prefetch
            className="group/write flex items-center gap-3 rounded-xl border px-4 py-3 transition-all hover:bg-(--fill-hover) active:scale-[0.99]"
            style={{
              background: "rgba(34,197,94,0.05)",
              borderColor: "rgba(34,197,94,0.2)",
            }}
          >
            <div
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg"
              style={{ background: "rgba(34,197,94,0.12)" }}
            >
              <Check size={16} style={{ color: "var(--green)" }} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[12px] font-semibold" style={{ color: "var(--text-2)" }}>
                {meta.done}
              </p>
              <p className="text-[14px] font-semibold truncate" style={{ color: "var(--text-1)" }}>
                {write.fullName}
              </p>
            </div>
            <ArrowUpRight
              size={15}
              className="shrink-0 opacity-40 transition-opacity group-hover/write:opacity-80"
              style={{ color: "var(--text-3)" }}
            />
          </Link>
        );
      }
    }

    const profiles = extractProfilesFromOutput(name, part.output);
    if (profiles.length > 0) {
      return (
        <ProfileToolCard
          profiles={profiles}
          icon={Icon}
          label={meta.done}
          count={profiles.length}
        />
      );
    }

    return (
      <div
        className="inline-flex items-center gap-2 rounded-lg border px-3 py-2"
        style={{
          background: "var(--fill)",
          borderColor: "var(--border)",
        }}
      >
        <Icon size={14} style={{ color: "var(--text-3)" }} />
        <span className="text-[13px] font-medium" style={{ color: "var(--text-3)" }}>
          {meta.done}
        </span>
      </div>
    );
  }

  return null;
}

function ProfileToolCard({
  profiles,
  icon: Icon,
  label,
  count,
}: {
  profiles: import("@/shared/types/profile").Profile[];
  icon: typeof import("lucide-react").Search;
  label: string;
  count: number;
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div
      className="rounded-xl border overflow-hidden"
      style={{
        borderColor: "var(--border)",
        background: "var(--bg-raised)",
      }}
    >
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-(--fill)"
      >
        <div
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg"
          style={{ background: "rgba(147,197,253,0.12)" }}
        >
          <Icon size={15} style={{ color: "var(--blue)" }} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[13px] font-semibold" style={{ color: "var(--text-1)" }}>
            {label}
          </p>
          <p className="text-[11px] font-medium" style={{ color: "var(--text-3)" }}>
            {count} {count === 1 ? "profile" : "profiles"} found
          </p>
        </div>
        <motion.div
          animate={{ rotate: expanded ? 180 : 0 }}
          transition={{ duration: 0.2, ease: "easeInOut" }}
        >
          <ChevronDown size={16} style={{ color: "var(--text-3)" }} />
        </motion.div>
      </button>

      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: "easeInOut" }}
            className="overflow-hidden"
          >
            <div className="border-t px-4 py-3" style={{ borderColor: "var(--border)" }}>
              <ChatProfileList profiles={profiles} max={5} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function ErrorCard({ text }: { text: string }) {
  return (
    <div
      className="flex items-start gap-3 rounded-xl border px-4 py-3"
      style={{
        background: "var(--red-bg)",
        borderColor: "var(--red-border)",
      }}
    >
      <TriangleAlert size={15} className="mt-0.5 shrink-0" style={{ color: "var(--red)" }} />
      <span className="text-[13px] font-medium leading-snug" style={{ color: "var(--red)" }}>
        {text}
      </span>
    </div>
  );
}
