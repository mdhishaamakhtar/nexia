import { motion } from "framer-motion";
import type { LucideIcon } from "lucide-react";

/**
 * One card in the profile form. Shares its header treatment with the profile
 * detail sections so editing and reading feel like the same document.
 */
export default function ProfileFormSection({
  id,
  title,
  icon: Icon,
  children,
  index = 0,
}: {
  id: string;
  title: string;
  icon: LucideIcon;
  children: React.ReactNode;
  index?: number;
}) {
  return (
    <motion.section
      id={id}
      aria-labelledby={`${id}-heading`}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1], delay: index * 0.05 }}
      className="paper scroll-mt-24 rounded-3xl p-5 sm:p-7"
    >
      <header className="mb-6 flex items-center gap-2.5">
        <span
          className="flex h-7 w-7 items-center justify-center rounded-lg"
          style={{ background: "var(--surface-2)", color: "var(--text-2)" }}
        >
          <Icon className="h-3.5 w-3.5" aria-hidden="true" />
        </span>
        <h2 id={`${id}-heading`} className="t-label">
          {title}
        </h2>
      </header>
      {children}
    </motion.section>
  );
}
