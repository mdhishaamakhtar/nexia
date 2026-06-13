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
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.96 }}
      transition={{ type: "spring", stiffness: 220, damping: 26 }}
      className="flex min-h-[calc(100%-2rem)] flex-col items-center justify-center px-2 py-8 text-center"
    >
      <div
        className="floating mb-6 flex h-20 w-20 items-center justify-center rounded-3xl border"
        style={{
          background: "var(--fill-hover)",
          borderColor: "var(--border)",
          transform: "rotate(-3deg)",
          boxShadow: "3px 3px 0 var(--border-mid)",
        }}
      >
        <StickerSparkle size={40} className="text-(--blue)" />
      </div>

      <h2 className="mb-1 text-xl font-bold" style={{ color: "var(--text-1)" }}>
        {greeting()}
      </h2>
      <p className="mb-2 max-w-xs text-sm font-medium" style={{ color: "var(--text-2)" }}>
        Ask me anything about your people
      </p>
      <p className="mb-10 max-w-[280px] text-xs leading-relaxed" style={{ color: "var(--text-3)" }}>
        I search your profiles and can even add or update people for you.
      </p>

      <div className="grid w-full max-w-md grid-cols-1 gap-2.5 sm:grid-cols-2">
        {PROMPTS.map((prompt, i) => (
          <motion.button
            key={prompt.text}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 + i * 0.06, type: "spring", stiffness: 260, damping: 24 }}
            onClick={() => onPrompt(prompt.text)}
            className="group flex items-center gap-3 rounded-xl border bg-(--bg-raised) px-4 py-3.5 text-left transition-all hover:bg-(--fill-hover) active:scale-[0.98]"
            style={{ borderColor: "var(--border)" }}
          >
            <div
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-transform group-hover:scale-110"
              style={{ background: `${prompt.accent}22` }}
            >
              <prompt.icon size={15} style={{ color: prompt.accent }} />
            </div>
            <span className="text-xs font-medium leading-snug" style={{ color: "var(--text-2)" }}>
              {prompt.text}
            </span>
          </motion.button>
        ))}
      </div>

      <div className="mt-10 flex items-center gap-1.5">
        <Sparkles size={11} style={{ color: "var(--blue)" }} />
        <span className="label-caps text-[10px]" style={{ color: "var(--text-3)" }}>
          Powered by your profiles
        </span>
      </div>
    </motion.div>
  );
}
