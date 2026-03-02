"use client";

import { AnimatePresence, motion } from "framer-motion";
import Button from "@/components/atoms/Button";

interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
  isConfirming?: boolean;
}

export default function ConfirmDialog({
  isOpen,
  title,
  description,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  onConfirm,
  onCancel,
  isConfirming = false,
}: ConfirmDialogProps) {
  return (
    <AnimatePresence>
      {isOpen ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-[2px]"
          style={{ background: "rgba(30, 41, 59, 0.4)" }}
          onClick={onCancel}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.9, rotate: -2, y: 20 }}
            animate={{ opacity: 1, scale: 1, rotate: 0.5, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, rotate: -2, y: 20 }}
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
            className="w-full max-w-sm rounded-4xl p-8 relative glass-panel scrapbook-card"
            style={{
              borderColor: "var(--border-mid)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Scrapbook Tape */}
            <div
              className="washi-tape-accent w-24 h-6 -top-2.5!"
              style={{ background: "var(--peach)", opacity: 0.9 }}
            />

            <h3
              className="text-xl font-bold tracking-tight mb-3"
              style={{ color: "var(--text-1)" }}
            >
              {title}
            </h3>
            <p className="text-sm leading-relaxed" style={{ color: "var(--text-2)" }}>
              {description}
            </p>

            <div className="mt-5 flex justify-end gap-2">
              <Button variant="ghost" onClick={onCancel} disabled={isConfirming}>
                {cancelLabel}
              </Button>
              <Button variant="destructive" onClick={onConfirm} isLoading={isConfirming}>
                {confirmLabel}
              </Button>
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
