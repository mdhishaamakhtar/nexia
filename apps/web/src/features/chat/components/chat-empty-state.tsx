"use client";

import { motion } from "framer-motion";
import { enter } from "@/shared/ui/motion";

/** Each suggestion takes one of the colours a person can be. */
const PROMPTS = [
  { text: "Whose birthday is coming up?", color: "person-butter" },
  { text: "Who's vegetarian?", color: "person-mint" },
  { text: "Who would enjoy a jazz night?", color: "person-lilac" },
  { text: "Add a friend called Asha", color: "person-pink" },
] as const;

/**
 * The start of a conversation: the question, what Nexia does with it, and four
 * things to try, each a block of colour like the people they are about. On a
 * phone the four are single-line rows, so the whole thing fits above the
 * composer without scrolling.
 */
export function ChatEmptyState({ onPrompt }: { onPrompt: (text: string) => void }) {
  return (
    <motion.div {...enter(0, 10)} className="flex flex-1 flex-col justify-center py-3 sm:py-6">
      <h2 className="t-page-title text-balance text-text-1">What would you like to remember?</h2>
      <p className="t-body mt-3 max-w-lg text-pretty text-text-2 sm:mt-4">
        Nexia reads your profiles to answer. It can add or update someone too, and you approve every
        change before it&apos;s saved.
      </p>

      <ul className="mt-5 grid grid-cols-1 gap-2 sm:mt-7 sm:grid-cols-2 sm:gap-3">
        {PROMPTS.map((prompt) => (
          <li key={prompt.text} className="flex">
            <button
              type="button"
              onClick={() => onPrompt(prompt.text)}
              className={`${prompt.color} card-person flex min-h-14 flex-1 cursor-pointer items-center rounded-[1.375rem] px-5 py-3 text-left text-[1.0625rem] font-bold leading-[1.15] tracking-[-0.015em] transition-transform duration-200 ease-out hover:-translate-y-0.5 active:scale-[0.985] sm:min-h-28 sm:items-end sm:rounded-[1.5rem] sm:py-4 sm:text-[1.375rem] sm:leading-[1.1] sm:tracking-[-0.02em]`}
            >
              {prompt.text}
            </button>
          </li>
        ))}
      </ul>

      <p className="mt-4 text-sm leading-relaxed text-text-3 sm:mt-6">
        The profiles Nexia reads to answer you are sent to the AI services that power it.
      </p>
    </motion.div>
  );
}
