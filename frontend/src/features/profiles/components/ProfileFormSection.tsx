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
    <motion.div
      id={id}
      initial={{ opacity: 0, x: -20, rotate: -1 }}
      whileInView={{ opacity: 1, x: 0, rotate: 0 }}
      viewport={{ once: true, margin: "-100px" }}
      transition={{
        type: "spring",
        damping: 20,
        stiffness: 100,
        delay: index * 0.1,
      }}
      className="scroll-mt-24 relative group"
    >
      {/* Decorative Washi Tape Effect */}
      <div
        className="absolute -top-3 left-1/2 -translate-x-1/2 w-24 h-6 opacity-40 group-hover:opacity-80 transition-opacity z-10 hidden sm:block"
        style={{
          background: index % 2 === 0 ? "var(--lavender)" : "var(--peach)",
          clipPath: "polygon(5% 0%, 95% 0%, 100% 50%, 95% 100%, 5% 100%, 0% 50%)",
          transform: `rotate(${index % 2 === 0 ? -2 : 2}deg)`,
        }}
      />

      <div className="glass-panel rounded-2xl p-6 sm:p-7 relative overflow-hidden">
        <div className="mb-6 flex items-center gap-3">
          <div
            className="rounded-xl p-2"
            style={{ background: "var(--fill)", color: "var(--text-3)" }}
          >
            <Icon className="h-4 w-4" />
          </div>
          <h2
            className="text-[11px] font-bold uppercase tracking-[0.14em]"
            style={{ color: "var(--text-3)" }}
          >
            {title}
          </h2>
        </div>
        <div className="space-y-5">{children}</div>
      </div>
    </motion.div>
  );
}
