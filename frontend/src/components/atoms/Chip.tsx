import { X } from "lucide-react";
import { motion } from "framer-motion";

interface ChipProps {
  label: string;
  onDelete?: () => void;
}

export default function Chip({ label, onDelete }: ChipProps) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.8 }}
      className="inline-flex items-center gap-2 px-3 py-1.5 bg-[var(--color-surface)] border border-[var(--color-border-subtle)] rounded-full text-sm text-[var(--color-text-primary)] shadow-sm hover:border-[var(--color-primary-from)] transition-colors"
    >
      <span>{label}</span>
      {onDelete && (
        <button
          type="button"
          onClick={onDelete}
          className="p-0.5 hover:bg-white/10 rounded-full transition-colors"
        >
          <X className="w-3 h-3" />
        </button>
      )}
    </motion.div>
  );
}
