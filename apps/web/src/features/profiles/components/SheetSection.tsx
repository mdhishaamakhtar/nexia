"use client";

import { motion } from "framer-motion";
import type { ProfileSectionDef } from "../sections";

/**
 * One section of a profile sheet — used by both the detail page and the form.
 *
 * A profile is one sheet of paper, not a stack of cards. The old treatment
 * gave every section its own white panel with a grey icon tile and an 11px
 * caps label, which made a kept slambook look like a settings screen and left
 * section headings and field labels sharing a single type size. Here the
 * heading is a real title, a strip of tape opens it, and a hairline runs out
 * to the sheet's edge — the same three moves the PDF export makes.
 *
 * The section owns its rhythm: more air above the heading than below it, so
 * the rule reads as the start of what follows rather than the end of what came
 * before. `first:pt-0` is for the form, whose sheet opens straight onto a
 * section and gets its spacing from the sheet's own padding; on the detail page
 * the first section follows the hero's closing rule and keeps its top gap.
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
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1], delay: 0.06 + index * 0.06 }}
      className="scroll-mt-20 pt-8 first:pt-0 sm:pt-10"
    >
      <header className="mb-5 flex items-center gap-3">
        <span className="tape-mark" style={{ background: section.tape }} aria-hidden="true" />
        <h2
          id={`${section.id}-heading`}
          className="t-section-title"
          style={{ color: "var(--text-1)" }}
        >
          {section.title}
        </h2>
        <span className="h-px flex-1 bg-(--border)" aria-hidden="true" />
      </header>
      {children}
    </motion.section>
  );
}
