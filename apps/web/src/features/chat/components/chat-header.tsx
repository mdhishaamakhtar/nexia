"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowLeft, Trash2 } from "lucide-react";
import { NexiaAvatar } from "@/shared/ui/AIIcons";

export function ChatHeader({ onClear, canClear }: { onClear: () => void; canClear: boolean }) {
  return (
    <motion.header
      initial={{ opacity: 0, y: -6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: "spring", stiffness: 280, damping: 28 }}
      className="flex shrink-0 items-center gap-3 pb-3"
    >
      <Link
        href="/profiles"
        prefetch
        aria-label="Back to profiles"
        className="-ml-1.5 flex h-8 w-8 items-center justify-center rounded-full transition-colors hover:bg-(--fill)"
        style={{ color: "var(--text-3)" }}
      >
        <ArrowLeft size={16} />
      </Link>

      <NexiaAvatar size={34} tilt={-3} />

      <div className="flex min-w-0 flex-col">
        <span
          className="text-[15px] font-extrabold leading-tight tracking-tight"
          style={{ color: "var(--text-1)" }}
        >
          Nexia Intel
        </span>
        <span
          className="flex items-center gap-1.5 text-[11px] font-semibold"
          style={{ color: "var(--text-3)" }}
        >
          <span className="relative flex h-1.5 w-1.5">
            <span
              className="absolute inline-flex h-full w-full animate-ping rounded-full opacity-60"
              style={{ background: "var(--green)" }}
            />
            <span
              className="relative inline-flex h-1.5 w-1.5 rounded-full"
              style={{ background: "var(--green)" }}
            />
          </span>
          knows your people
        </span>
      </div>

      <button
        onClick={onClear}
        disabled={!canClear}
        aria-label="Clear conversation"
        className="ml-auto flex h-8 w-8 items-center justify-center rounded-full transition-all duration-200 enabled:hover:bg-(--fill) enabled:hover:text-(--red) disabled:opacity-0"
        style={{ color: "var(--text-3)" }}
      >
        <Trash2 size={15} />
      </button>
    </motion.header>
  );
}
