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
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[100] flex flex-col items-center gap-3 w-full max-w-[90vw] pointer-events-none">
        <AnimatePresence mode="popLayout">
          {toasts.map((toast) => (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, y: 20, scale: 0.9, rotate: -2 }}
              animate={{ opacity: 1, y: 0, scale: 1, rotate: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10, transition: { duration: 0.2 } }}
              layout
              className="sticker-chip pointer-events-auto flex items-center gap-3 px-4 py-2.5 shadow-[0_4px_12px_rgba(0,0,0,0.08)] relative group overflow-hidden"
              style={{
                background: "var(--bg-raised)",
                borderColor:
                  toast.type === "error" ? "rgba(239, 68, 68, 0.2)" : "var(--border-mid)",
              }}
            >
              {/* Glass subtle shimmer on top */}
              <div className="absolute inset-0 bg-white/40 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />

              <div
                className="flex items-center justify-center w-6 h-6 rounded-full shrink-0"
                style={{
                  background:
                    toast.type === "error" ? "rgba(239, 68, 68, 0.1)" : "rgba(147, 197, 253, 0.15)",
                }}
              >
                {toast.type === "success" ? (
                  <CheckCircle2 className="w-3.5 h-3.5" style={{ color: "var(--blue)" }} />
                ) : (
                  <AlertCircle className="w-3.5 h-3.5" style={{ color: "var(--red)" }} />
                )}
              </div>

              <span className="text-[11px] font-bold tracking-tight text-(--text-1) whitespace-nowrap">
                {toast.message}
              </span>

              <button
                onClick={() => remove(toast.id)}
                className="ml-1 p-0.5 rounded-full hover:bg-black/5 transition-colors cursor-pointer"
              >
                <X className="w-3 h-3 text-(--text-3)" />
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
