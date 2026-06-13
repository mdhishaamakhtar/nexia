"use client";

import type { LucideIcon } from "lucide-react";
import { Heart, Music, Star, UserPlus } from "lucide-react";
import { motion } from "framer-motion";
import { NexiaAvatar } from "@/shared/ui/AIIcons";

interface PromptDef {
  text: string;
  icon: LucideIcon;
  accent: string;
}

const PROMPTS: PromptDef[] = [
  { text: "Who are my oldest friends?", icon: Heart, accent: "var(--peach)" },
  { text: "Who shares my zodiac sign?", icon: Star, accent: "var(--lavender)" },
  { text: "Add a new friend named Asha", icon: UserPlus, accent: "var(--blue)" },
  { text: "Recommend a song from my friends' tastes", icon: Music, accent: "var(--green)" },
];

function greeting(): string {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 12) return "Good morning";
  if (hour >= 12 && hour < 17) return "Good afternoon";
  if (hour >= 17 && hour < 21) return "Good evening";
  return "Up late?";
}

export function ChatEmptyState({ onPrompt }: { onPrompt: (text: string) => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.98 }}
      transition={{ type: "spring", stiffness: 240, damping: 26 }}
      className="flex min-h-[calc(100%-1rem)] flex-col items-center justify-center px-2 py-8 text-center"
    >
      <div className="floating mb-5">
        <NexiaAvatar size={60} tilt={-4} />
      </div>

      <h2 className="text-[22px] font-extrabold tracking-tight" style={{ color: "var(--text-1)" }}>
        {greeting()}
      </h2>
      <p
        className="mt-1.5 max-w-[19rem] text-[14px] leading-relaxed font-medium"
        style={{ color: "var(--text-2)" }}
      >
        Ask me anything about your people. I can look someone up, or add and update them for you.
      </p>

      <div className="mt-7 grid w-full max-w-md grid-cols-1 gap-2.5 sm:grid-cols-2">
        {PROMPTS.map((prompt, i) => (
          <motion.button
            key={prompt.text}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 + i * 0.05, type: "spring", stiffness: 280, damping: 26 }}
            onClick={() => onPrompt(prompt.text)}
            className="group flex items-center gap-3 rounded-2xl border px-3.5 py-3 text-left transition-all duration-200 hover:-translate-y-0.5 hover:bg-(--fill-hover) active:translate-y-0 active:scale-[0.98]"
            style={{ borderColor: "var(--border)", background: "var(--bg-raised)" }}
          >
            <span
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl transition-transform duration-200 group-hover:scale-110 group-hover:-rotate-6"
              style={{ background: `color-mix(in srgb, ${prompt.accent} 22%, transparent)` }}
            >
              <prompt.icon size={15} style={{ color: prompt.accent }} strokeWidth={2.4} />
            </span>
            <span
              className="text-[12.5px] font-semibold leading-snug"
              style={{ color: "var(--text-2)" }}
            >
              {prompt.text}
            </span>
          </motion.button>
        ))}
      </div>
    </motion.div>
  );
}
