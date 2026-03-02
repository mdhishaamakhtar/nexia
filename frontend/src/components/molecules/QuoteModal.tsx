"use client";

import { X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function QuoteModal({ quote, onClose }: { quote: string; onClose: () => void }) {
  return (
    <AnimatePresence>
      <div
        className="fixed inset-0 backdrop-blur-md flex items-center justify-center z-50 p-4"
        style={{ background: "rgba(0,0,0,0.5)" }}
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.93, y: 16 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.93, y: 16 }}
          transition={{ type: "spring", stiffness: 300, damping: 28 }}
          className="glass-panel rounded-2xl p-8 max-w-xl w-full max-h-[80vh] overflow-y-auto"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex justify-between items-start mb-8">
            <h3
              className="text-[10px] font-bold uppercase tracking-[0.2em]"
              style={{ color: "var(--text-3)" }}
            >
              words they said
            </h3>
            <button
              onClick={onClose}
              className="rounded-lg p-1.5 transition-colors -mt-1 -mr-1 hover:bg-(--fill) hover:text-(--text-1)"
              style={{ color: "var(--text-3)" }}
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <blockquote className="relative pl-5">
            <span
              className="absolute left-0 top-0 text-4xl leading-none -mt-2 select-none"
              style={{ color: "var(--border-mid)" }}
            >
              &ldquo;
            </span>
            <p
              className="text-xl sm:text-2xl leading-relaxed italic"
              style={{ color: "var(--text-1)" }}
            >
              {quote}
            </p>
            <span
              className="absolute -bottom-4 right-0 text-4xl leading-none select-none"
              style={{ color: "var(--border-mid)" }}
            >
              &rdquo;
            </span>
          </blockquote>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
