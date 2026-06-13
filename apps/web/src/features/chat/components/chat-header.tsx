"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowLeft, Trash2 } from "lucide-react";
import { NexiaIcon } from "@/shared/ui/AIIcons";

export function ChatHeader({ onClear }: { onClear: () => void }) {
  return (
    <motion.header
      initial={{ opacity: 0, y: -12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: "spring", stiffness: 260, damping: 28 }}
      className="glass-panel relative mb-4 flex shrink-0 items-center justify-between overflow-visible rounded-2xl px-4 py-3"
    >
      <div className="washi-tape-accent w-16" />

      <Link
        href="/profiles"
        prefetch
        aria-label="Back to profiles"
        className="flex items-center gap-1.5 rounded-lg px-1.5 py-1 text-xs font-semibold transition-colors hover:bg-(--fill-hover)"
        style={{ color: "var(--text-3)" }}
      >
        <ArrowLeft size={15} />
        <span className="hidden sm:inline">Profiles</span>
      </Link>

      <div className="flex items-center gap-2.5">
        <div className="rounded-xl p-1.5" style={{ background: "var(--blue)" }}>
          <NexiaIcon size={18} className="text-white" />
        </div>
        <div className="flex flex-col">
          <span className="text-sm font-bold leading-tight" style={{ color: "var(--text-1)" }}>
            Nexia Intel
          </span>
          <div className="flex items-center gap-1">
            <span
              className="h-1.5 w-1.5 animate-pulse rounded-full"
              style={{ background: "var(--green)" }}
            />
            <span className="label-caps text-[10px]" style={{ color: "var(--text-3)" }}>
              online
            </span>
          </div>
        </div>
      </div>

      <button
        onClick={onClear}
        aria-label="Clear conversation"
        className="rounded-xl p-2 transition-all duration-200 hover:rotate-12 hover:bg-(--fill-hover)"
        style={{ color: "var(--text-3)" }}
      >
        <Trash2 size={15} />
      </button>
    </motion.header>
  );
}
