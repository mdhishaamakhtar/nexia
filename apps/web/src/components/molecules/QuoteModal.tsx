"use client";

import { X } from "lucide-react";
import { motion } from "framer-motion";
import { useEffect } from "react";

export default function QuoteModal({ quote, onClose }: { quote: string; onClose: () => void }) {
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
      className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-[2px]"
      style={{ background: "var(--overlay)" }}
      onClick={onClose}
    >
      <motion.div
        role="dialog"
        aria-modal="true"
        aria-label="Quote"
        initial={{ opacity: 0, scale: 0.96, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 8 }}
        transition={{ type: "spring", stiffness: 520, damping: 34 }}
        className="flex max-h-[80vh] w-full max-w-xl flex-col rounded-2xl border"
        style={{
          background: "var(--bg-raised)",
          borderColor: "var(--border-mid)",
          boxShadow: "0 12px 32px rgba(15, 23, 42, 0.16)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-start px-8 pt-8 pb-4">
          <h3
            className="text-[11px] font-bold uppercase tracking-[0.2em]"
            style={{ color: "var(--text-3)" }}
          >
            words they said
          </h3>
          <button
            onClick={onClose}
            aria-label="Close quote"
            className="-mt-1 -mr-1 rounded-lg p-1.5 transition hover:scale-110 hover:bg-[var(--border)] hover:text-(--text-1)"
            style={{ color: "var(--text-3)" }}
          >
            <X className="w-4 h-4" aria-hidden="true" />
          </button>
        </div>

        <div className="min-h-0 overflow-y-auto px-8 pb-8 pt-2">
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
