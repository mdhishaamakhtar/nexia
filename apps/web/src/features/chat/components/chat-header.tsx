"use client";

import { motion } from "framer-motion";
import { Trash2 } from "lucide-react";
import { NexiaAvatar } from "@/shared/ui/AIIcons";
import BackButton from "@/components/atoms/BackButton";

export function ChatHeader({ onClear, canClear }: { onClear: () => void; canClear: boolean }) {
  return (
    <motion.header
      initial={{ opacity: 0, y: -6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: "spring", stiffness: 280, damping: 28 }}
      // Tighter on a phone: every row of chrome here is a row the transcript
      // does not get, and the navbar above already says where you are.
      className="flex shrink-0 items-center gap-2.5 pb-2.5 sm:gap-3 sm:pb-3"
    >
      <BackButton href="/profiles" className="-ml-1" />

      <NexiaAvatar size={30} tilt={-3} />

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
              style={{ background: "var(--green-ink)" }}
            />
            <span
              className="relative inline-flex h-1.5 w-1.5 rounded-full"
              style={{ background: "var(--green-ink)" }}
            />
          </span>
          knows your people
        </span>
      </div>

      <button
        onClick={onClear}
        disabled={!canClear}
        aria-label="Clear conversation"
        className="ml-auto flex h-8 w-8 items-center justify-center rounded-full transition-all duration-200 enabled:hover:bg-(--surface-2) enabled:hover:text-(--red-ink) disabled:opacity-0"
        style={{ color: "var(--text-3)" }}
      >
        <Trash2 size={15} />
      </button>
    </motion.header>
  );
}
