import Link from "next/link";
import { ArrowUpRight, Check, Loader2, TriangleAlert } from "lucide-react";
import {
  extractToolError,
  extractWriteResult,
  toolMetaFor,
  toolNameOf,
  type ToolPart,
} from "@/features/chat/lib/tool-meta";

const chipBase =
  "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[11px] font-semibold transition-all";

export function ToolActivity({ part }: { part: ToolPart }) {
  const name = toolNameOf(part);
  const meta = toolMetaFor(name);
  const Icon = meta.icon;

  if (part.state === "input-streaming" || part.state === "input-available") {
    return (
      <div
        className={chipBase}
        style={{
          background: "rgba(147,197,253,0.08)",
          borderColor: "rgba(147,197,253,0.2)",
          color: "var(--text-2)",
        }}
      >
        <Loader2 size={11} className="animate-spin" style={{ color: "var(--blue)" }} />
        <span>{meta.active}...</span>
      </div>
    );
  }

  if (part.state === "output-error") {
    return <ErrorChip text={part.errorText ?? "Something went wrong"} />;
  }

  if (part.state === "output-available") {
    const softError = extractToolError(part.output);
    if (softError) return <ErrorChip text={softError} />;

    const write = meta.isWrite ? extractWriteResult(part.output) : null;
    if (write) {
      return (
        <Link
          href={`/profiles/${write.id}`}
          prefetch
          className={`${chipBase} hover:bg-(--fill-hover) active:scale-[0.97]`}
          style={{
            background: "rgba(34,197,94,0.06)",
            borderColor: "rgba(34,197,94,0.18)",
            color: "var(--text-1)",
          }}
        >
          <Check size={12} style={{ color: "var(--green)" }} />
          <span>
            {meta.done} {write.fullName}
          </span>
          <ArrowUpRight size={11} style={{ color: "var(--text-3)" }} />
        </Link>
      );
    }

    return (
      <div
        className={chipBase}
        style={{
          background: "var(--fill)",
          borderColor: "var(--border)",
          color: "var(--text-3)",
        }}
      >
        <Icon size={11} style={{ color: "var(--text-3)" }} />
        <span>{meta.done}</span>
      </div>
    );
  }

  return null;
}

function ErrorChip({ text }: { text: string }) {
  return (
    <div
      className={chipBase}
      title={text}
      style={{
        background: "var(--red-bg)",
        borderColor: "var(--red-border)",
        color: "var(--red)",
      }}
    >
      <TriangleAlert size={11} />
      <span className="max-w-[16rem] truncate">{text}</span>
    </div>
  );
}
