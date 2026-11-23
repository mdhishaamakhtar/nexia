"use client";

import { motion } from "framer-motion";
import { enter } from "@/shared/ui/motion";
import type { ProfileSectionDef } from "../sections";

/**
 * One section of the profile form: a titled, rounded panel with its fields
 * inside, under the same title the profile page gives that section. The panel
 * takes the colour of the person being edited (a tint of it), and is neutral
 * when they are new and have no colour yet.
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
      id={`section-${section.id}`}
      aria-labelledby={`section-${section.id}-heading`}
      {...enter(0.06 + index * 0.06)}
      className="panel-person scroll-mt-24 rounded-[1.75rem] px-5 py-6 sm:p-8"
    >
      <h2 id={`section-${section.id}-heading`} className="t-section-title mb-6 text-text-1">
        {section.title}
      </h2>
      {children}
    </motion.section>
  );
}
