"use client";

import { X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
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
    <AnimatePresence>
      <div
        className="fixed inset-0 backdrop-blur-md flex items-center justify-center z-50 p-4"
        style={{ background: "rgba(0,0,0,0.5)" }}
        onClick={onClose}
      >
        <motion.div
          role="dialog"
          aria-modal="true"
          aria-label="Quote"
          initial={{ opacity: 0, scale: 0.93, y: 20, rotate: -2 }}
          animate={{ opacity: 1, scale: 1, y: 0, rotate: -0.5 }}
          exit={{ opacity: 0, scale: 0.9, y: 12, rotate: -2 }}
          transition={{ type: "spring", stiffness: 280, damping: 26 }}
          className="glass-panel rounded-2xl max-w-xl w-full max-h-[80vh] overflow-hidden flex flex-col"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="overflow-y-auto p-8">
            <div className="flex justify-between items-start mb-8">
              <h3
                className="text-[11px] font-bold uppercase tracking-[0.2em]"
                style={{ color: "var(--text-3)" }}
              >
                words they said
              </h3>
              <button
                onClick={onClose}
                aria-label="Close quote"
                className="rounded-lg p-1.5 transition-colors -mt-1 -mr-1 hover:bg-(--fill) hover:text-(--text-1)"
                style={{ color: "var(--text-3)" }}
              >
                <X className="w-4 h-4" aria-hidden="true" />
              </button>
            </div>

            <blockquote className="relative pl-5">
              <span
                className="absolute left-0 top-0 text-4xl leading-none -mt-2 select-none"
                style={{ color: "var(--border-mid)" }}
                aria-hidden="true"
              >
                &ldquo;
              </span>
              <p
                className="text-xl sm:text-2xl leading-relaxed italic break-words"
                style={{ color: "var(--text-1)" }}
              >
                {quote}
              </p>
              <span
                className="absolute -bottom-4 right-0 text-4xl leading-none select-none"
                style={{ color: "var(--border-mid)" }}
                aria-hidden="true"
              >
                &rdquo;
              </span>
            </blockquote>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
