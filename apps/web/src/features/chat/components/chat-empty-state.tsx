"use client";

import { motion } from "framer-motion";
import Tape from "@/components/atoms/Tape";
import { enter } from "@/shared/ui/motion";

const PROMPTS = [
  "Whose birthday is coming up?",
  "Who's vegetarian?",
  "Who would enjoy a jazz night?",
  "Add a friend called Asha",
];

/**
 * The start of a conversation, as a note pinned in the scrapbook rather than
 * the usual assistant splash. The suggestions are paper stickers, the same
 * chips the profiles use.
 */
export function ChatEmptyState({ onPrompt }: { onPrompt: (text: string) => void }) {
  return (
    <motion.div
      {...enter(0, 10)}
      className="flex flex-1 flex-col items-center justify-center px-1 py-8"
    >
      <div className="paper relative w-full max-w-md rounded-3xl px-6 pb-6 pt-8 sm:px-8">
        <Tape color="blue" width={92} height={22} tilt={-2.5} />
        <p className="t-label mb-1.5">Ask your slambook</p>
        <h2 className="t-section-title text-balance text-text-1">
          What would you like to remember?
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-text-2">
          Nexia reads your profiles to answer. It can add or update someone too, and you approve
          every change before it&apos;s saved.
        </p>

        <ul className="mt-5 flex flex-wrap gap-2">
          {PROMPTS.map((prompt) => (
            <li key={prompt}>
              <button
                type="button"
                onClick={() => onPrompt(prompt)}
                className="sticker-chip min-h-11 px-4 text-left text-sm font-semibold transition-colors hover:border-line-mid hover:bg-surface-3 hover:text-text-1"
              >
                {prompt}
              </button>
            </li>
          ))}
        </ul>

        <p className="mt-5 border-t border-line pt-3 text-xs leading-relaxed text-text-3">
          The profiles Nexia reads to answer you are sent to the AI services that power it.
        </p>
      </div>
    </motion.div>
  );
}
