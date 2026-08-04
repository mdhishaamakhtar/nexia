"use client";

import { X } from "lucide-react";
import { motion } from "framer-motion";
import { useEffect } from "react";

export default function QuoteModal({
  quote,
  onClose,
  title = "words they said",
}: {
  quote: string;
  onClose: () => void;
  title?: string;
}) {
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [onClose]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.12 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-5"
      style={{ background: "var(--overlay)" }}
      onClick={onClose}
    >
      <motion.div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        initial={{ opacity: 0, scale: 0.96, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 8 }}
        transition={{ type: "spring", stiffness: 520, damping: 34 }}
        className="paper flex max-h-[80dvh] w-full max-w-xl flex-col rounded-3xl"
        style={{ borderColor: "var(--border-mid)" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 px-6 pb-4 pt-6 sm:px-8 sm:pt-8">
          <h2 className="t-label">{title}</h2>
          <button
            onClick={onClose}
            aria-label="Close"
            className="-mr-2 -mt-2 flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition-colors hover:bg-(--surface-2) hover:text-(--text-1)"
            style={{ color: "var(--text-3)" }}
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        <div className="min-h-0 overflow-y-auto px-6 pb-6 pt-1 sm:px-8 sm:pb-8">
          <p
            className="text-xl leading-relaxed break-words sm:text-2xl"
            style={{ color: "var(--text-1)" }}
          >
            {quote}
          </p>
        </div>
      </motion.div>
    </motion.div>
  );
}
