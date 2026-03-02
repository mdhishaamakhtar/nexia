"use client";

import { createContext, useCallback, useContext, useMemo, useState } from "react";
import { motion } from "framer-motion";

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
    }, 3500);
  }, []);

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
      <div className="fixed bottom-4 left-4 z-[100] flex w-full max-w-sm flex-col gap-2">
        {toasts.map((toast, idx) => (
          <motion.div
            key={toast.id}
            initial={{ opacity: 0, x: -40, rotate: -10, scale: 0.8 }}
            animate={{ opacity: 1, x: 0, rotate: idx % 2 === 0 ? -2 : 2, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8, x: -20 }}
            transition={{ type: "spring", stiffness: 400, damping: 25 }}
            className="glass-panel scrapbook-card rounded-2xl px-5 py-3.5 text-xs font-bold tracking-tight flex items-center gap-3 relative overflow-hidden"
            style={{
              borderColor: toast.type === "error" ? "rgba(239, 68, 68, 0.4)" : "var(--lavender)",
              color: "var(--text-1)",
              boxShadow: "2px 2px 0px var(--border-mid)",
            }}
          >
            {/* Sticker side accent */}
            <div
              className="absolute left-0 top-0 bottom-0 w-1"
              style={{ background: toast.type === "error" ? "var(--red)" : "var(--blue)" }}
            />

            <div
              className={`w-2 h-2 rounded-full shrink-0 ${toast.type === "error" ? "bg-red-500" : "bg-emerald-500"} animate-pulse`}
            />
            {toast.message}
          </motion.div>
        ))}
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
