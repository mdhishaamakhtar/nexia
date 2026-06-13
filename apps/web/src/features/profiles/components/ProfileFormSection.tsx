import { motion } from "framer-motion";
import type { LucideIcon } from "lucide-react";

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
      initial={{ opacity: 0, y: 14 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ type: "spring", damping: 22, stiffness: 150, delay: index * 0.06 }}
      className="scroll-mt-24"
    >
      <div className="glass-panel rounded-3xl p-6 sm:p-7">
        <header className="mb-6 flex items-center gap-2.5">
          <span
            className="flex h-7 w-7 items-center justify-center rounded-lg"
            style={{ background: "var(--fill)", color: "var(--text-2)" }}
          >
            <Icon className="h-3.5 w-3.5" aria-hidden="true" />
          </span>
          <h2
            className="text-[11px] font-bold uppercase tracking-[0.16em]"
            style={{ color: "var(--text-3)" }}
          >
            {title}
          </h2>
        </header>
        <div>{children}</div>
      </div>
    </motion.section>
  );
}
