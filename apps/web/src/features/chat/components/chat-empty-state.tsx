"use client";

import type { LucideIcon } from "lucide-react";
import { Heart, Music, Sparkles, Star, UserPlus } from "lucide-react";
import { motion } from "framer-motion";
import { StickerSparkle } from "@/shared/ui/AIIcons";

interface PromptDef {
  text: string;
  icon: LucideIcon;
  accent: string;
}

const PROMPTS: PromptDef[] = [
  { text: "Who are my oldest friends?", icon: Heart, accent: "var(--peach)" },
  { text: "Who shares my zodiac sign?", icon: Star, accent: "var(--lavender)" },
  { text: "Add a new friend named Asha", icon: UserPlus, accent: "var(--blue)" },
  {
    text: "Recommend a song based on my friends' tastes",
    icon: Music,
    accent: "var(--green)",
  },
];

function greeting(): string {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 12) return "Good morning";
  if (hour >= 12 && hour < 17) return "Good afternoon";
  if (hour >= 17 && hour < 21) return "Good evening";
  return "Late night session";
}

export function ChatEmptyState({ onPrompt }: { onPrompt: (text: string) => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.97 }}
      transition={{ type: "spring", stiffness: 240, damping: 26 }}
      className="flex min-h-[calc(100%-2rem)] flex-col items-center justify-center px-2 py-8 text-center"
    >
      <div
        className="floating mb-5 flex h-16 w-16 items-center justify-center rounded-2xl border"
        style={{
          background: "var(--fill-hover)",
          borderColor: "var(--border)",
          transform: "rotate(-2deg)",
          boxShadow: "2px 2px 0 var(--border-mid)",
        }}
      >
        <StickerSparkle size={32} className="text-(--blue)" />
      </div>

      <h2 className="mb-1 text-lg font-bold" style={{ color: "var(--text-1)" }}>
        {greeting()}
      </h2>
      <p className="mb-1.5 max-w-xs text-[13px] font-medium" style={{ color: "var(--text-2)" }}>
        Ask me anything about your people
      </p>
      <p
        className="mb-8 max-w-[260px] text-[11px] leading-relaxed"
        style={{ color: "var(--text-3)" }}
      >
        I search your profiles and can add or update people for you.
      </p>

      <div className="grid w-full max-w-sm grid-cols-1 gap-2 sm:grid-cols-2">
        {PROMPTS.map((prompt, i) => (
          <motion.button
            key={prompt.text}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.08 + i * 0.05, type: "spring", stiffness: 280, damping: 26 }}
            onClick={() => onPrompt(prompt.text)}
            className="group flex items-center gap-2.5 rounded-xl border px-3.5 py-3 text-left transition-all hover:bg-(--fill-hover) active:scale-[0.98]"
            style={{
              borderColor: "var(--border)",
              background: "var(--bg-raised)",
            }}
          >
            <div
              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg transition-transform group-hover:scale-110"
              style={{ background: `${prompt.accent}18` }}
            >
              <prompt.icon size={14} style={{ color: prompt.accent }} />
            </div>
            <span
              className="text-[11px] font-medium leading-snug"
              style={{ color: "var(--text-2)" }}
            >
              {prompt.text}
            </span>
          </motion.button>
        ))}
      </div>

      <div className="mt-8 flex items-center gap-1.5">
        <Sparkles size={10} style={{ color: "var(--blue)" }} />
        <span className="label-caps text-[9px]" style={{ color: "var(--text-3)" }}>
          Powered by your profiles
        </span>
      </div>
    </motion.div>
  );
}
