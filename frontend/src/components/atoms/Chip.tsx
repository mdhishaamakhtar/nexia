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
      className="sticker-chip inline-flex items-center gap-1.5 px-3 py-1 text-xs text-[var(--text-2)] hover:border-[var(--border-mid)] hover:text-[var(--text-1)] transition-all duration-200"
    >
      <span>{label}</span>
      {onDelete && (
        <button
          type="button"
          onClick={onDelete}
          className="p-0.5 hover:bg-[var(--fill-hover)] rounded-full transition-colors"
        >
          <X className="w-3 h-3" />
        </button>
      )}
    </motion.div>
  );
}
