"use client";

import { X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function QuoteModal({ quote, onClose }: { quote: string; onClose: () => void }) {
  return (
    <AnimatePresence>
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          className="glass-panel rounded-2xl p-8 max-w-2xl w-full max-h-[80vh] overflow-y-auto bg-[var(--color-bg)]/90 border border-[var(--color-border-highlight)] shadow-2xl shadow-indigo-500/10"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex justify-between items-start mb-6 border-b border-[var(--color-border-subtle)] pb-4">
            <h3 className="text-2xl font-semibold bg-clip-text text-transparent bg-gradient-to-r from-teal-400 to-emerald-400">
              Words they said
            </h3>
            <button
              onClick={onClose}
              className="hover:bg-[var(--color-surface-highlight)] rounded-lg p-2 transition-colors text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <blockquote className="text-xl leading-relaxed text-[var(--color-text-primary)] font-serif relative pl-6">
            <span className="absolute left-0 top-0 text-6xl text-[var(--color-border-highlight)] font-serif leading-none -mt-4">
              “
            </span>
            {quote}
            <span className="absolute -bottom-6 right-0 text-6xl text-[var(--color-border-highlight)] font-serif leading-none">
              ”
            </span>
          </blockquote>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
