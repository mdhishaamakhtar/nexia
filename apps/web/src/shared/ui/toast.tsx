"use client";

import { createContext, useCallback, useContext, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle2, AlertCircle, X } from "lucide-react";

type ToastType = "success" | "error";

interface ToastItem {
  id: number;
  type: ToastType;
  message: string;
}

interface ToastContextValue {
  success: (message: string) => void;
  error: (message: string) => void;
}

const ToastContext = createContext<ToastContextValue | undefined>(undefined);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const push = useCallback((type: ToastType, message: string) => {
    const id = Date.now() + Math.floor(Math.random() * 1000);
    setToasts((prev) => [...prev, { id, type, message }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((toast) => toast.id !== id));
    }, 4500); // Increased duration slightly for readability
  }, []);

  const remove = (id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  const value = useMemo(
    () => ({
      success: (message: string) => push("success", message),
      error: (message: string) => push("error", message),
    }),
    [push]
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        aria-live="polite"
        aria-atomic="false"
        className="pointer-events-none fixed left-1/2 z-100 flex w-full max-w-[92vw] -translate-x-1/2 flex-col items-center gap-2"
        style={{ bottom: "calc(1.5rem + env(safe-area-inset-bottom))" }}
      >
        <AnimatePresence mode="popLayout">
          {toasts.map((toast) => (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, y: 16, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95, y: 8, transition: { duration: 0.18 } }}
              transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
              layout
              className="pointer-events-auto flex max-w-full items-center gap-2.5 rounded-full border py-1.5 pl-3 pr-1.5"
              style={{
                background: "var(--surface)",
                borderColor: toast.type === "error" ? "var(--red-border)" : "var(--border-mid)",
              }}
            >
              <span
                className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full"
                style={{
                  background: toast.type === "error" ? "var(--red-bg)" : "var(--lavender-bg)",
                }}
                aria-hidden="true"
              >
                {toast.type === "success" ? (
                  <CheckCircle2 className="h-3.5 w-3.5" style={{ color: "var(--green-ink)" }} />
                ) : (
                  <AlertCircle className="h-3.5 w-3.5" style={{ color: "var(--red-ink)" }} />
                )}
              </span>

              <span
                className="min-w-0 truncate text-xs font-bold"
                style={{ color: "var(--text-1)" }}
              >
                {toast.message}
              </span>

              <button
                onClick={() => remove(toast.id)}
                aria-label="Dismiss notification"
                className="flex h-7 w-7 shrink-0 cursor-pointer items-center justify-center rounded-full transition-colors hover:bg-(--surface-2)"
                style={{ color: "var(--text-3)" }}
              >
                <X className="h-3.5 w-3.5" aria-hidden="true" />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within ToastProvider");
  }
  return context;
}
