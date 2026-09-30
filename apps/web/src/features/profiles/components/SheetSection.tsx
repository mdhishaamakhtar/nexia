"use client";

import { motion } from "framer-motion";
import { enter } from "@/shared/ui/motion";
import type { ProfileSectionDef } from "../sections";

/**
 * One section of a profile sheet — used by both the detail page and the form.
 *
 * A profile is one sheet of paper, not a stack of cards. A strip of tape opens
 * the section, a real title names it, and a hairline runs out to the sheet's
 * edge — the same three moves the PDF export makes. More air above the heading
 * than below it, so the rule reads as the start of what follows.
 */
export default function SheetSection({
  section,
  children,
  index = 0,
}: {
  section: ProfileSectionDef;
  children: React.ReactNode;
  index?: number;
}) {
  return (
    <motion.section
      id={section.id}
      aria-labelledby={`${section.id}-heading`}
      {...enter(0.06 + index * 0.06)}
      className="scroll-mt-20 pt-8 first:pt-0 sm:pt-10"
    >
      <header className="mb-5 flex items-center gap-3">
        <span
          className="tape-mark"
          style={{ background: `var(--${section.tape})` }}
          aria-hidden="true"
        />
        <h2 id={`${section.id}-heading`} className="t-section-title text-text-1">
          {section.title}
        </h2>
        <span className="h-px flex-1 bg-line" aria-hidden="true" />
      </header>
      {children}
    </motion.section>
  );
}
