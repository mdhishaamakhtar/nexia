"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle2, AlertCircle, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { EASE_OUT } from "@/shared/ui/motion";
import Tape from "@/components/atoms/Tape";

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

/** Errors stay long enough to read a sentence; confirmations get out of the way. */
const DURATION: Record<ToastType, number> = { success: 3500, error: 7000 };

/**
 * Toasts are small pinned notes: the same sheet, float line and tape as the
 * dialogs, cut down to one line of news. Lavender tape for "done", peach for
 * "something went wrong" — the same colours the dialogs use for the same moods.
 *
 * They drop in at the top, just under the navbar. The bottom of the screen
 * belongs to the form's Save bar and the chat composer, and a toast there used
 * to land on top of the very button it was reporting on.
 *
 * Errors are announced assertively and wrap to their full length; success is
 * polite. Hovering or focusing a toast pauses its timer.
 */
export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const nextId = useRef(0);

  const remove = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const push = useCallback((type: ToastType, message: string) => {
    nextId.current += 1;
    const id = nextId.current;
    // The same message twice in a row is one toast, not a stack.
    setToasts((prev) =>
      [...prev.filter((t) => t.message !== message), { id, type, message }].slice(-3)
    );
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
      <div
        className="pointer-events-none fixed inset-x-0 z-[60] flex flex-col items-center gap-2 px-4"
        style={{ top: "calc(var(--navbar-h) + 0.75rem + env(safe-area-inset-top, 0px))" }}
      >
        <div role="status" aria-live="polite" className="sr-only">
          {toasts.filter((t) => t.type === "success").at(-1)?.message}
        </div>
        <div role="alert" aria-live="assertive" className="sr-only">
          {toasts.filter((t) => t.type === "error").at(-1)?.message}
        </div>
        <AnimatePresence initial={false}>
          {toasts.map((toast) => (
            <Toast key={toast.id} toast={toast} onDismiss={remove} />
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}

function Toast({ toast, onDismiss }: { toast: ToastItem; onDismiss: (id: number) => void }) {
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (paused) return;
    const timer = setTimeout(() => onDismiss(toast.id), DURATION[toast.type]);
    return () => clearTimeout(timer);
  }, [paused, onDismiss, toast.id, toast.type]);

  const isError = toast.type === "error";
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: -12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8, transition: { duration: 0.18 } }}
      transition={{ duration: 0.3, ease: EASE_OUT }}
      onPointerEnter={() => setPaused(true)}
      onPointerLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
      className="pointer-events-auto relative flex w-full max-w-md items-start gap-2.5 rounded-2xl border-[1.5px] border-line-float bg-surface py-2.5 pl-3.5 pr-1.5"
    >
      <Tape
        color={isError ? "peach" : "lavender"}
        width={36}
        height={14}
        tilt={-6}
        style={{ left: 30, top: -6, opacity: 0.9 }}
      />
      <span
        className={cn(
          "mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full",
          isError ? "bg-red-bg" : "bg-green-soft"
        )}
        aria-hidden="true"
      >
        {isError ? (
          <AlertCircle className="h-3.5 w-3.5 text-red-ink" />
        ) : (
          <CheckCircle2 className="h-3.5 w-3.5 text-green-ink" />
        )}
      </span>

      <p className="min-w-0 flex-1 py-0.5 text-[13px] font-semibold leading-snug text-text-1">
        {toast.message}
      </p>

      <button
        type="button"
        onClick={() => onDismiss(toast.id)}
        aria-label="Dismiss notification"
        className="hit-44 flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-text-3 transition-colors hover:bg-surface-2 hover:text-text-1"
      >
        <X className="h-3.5 w-3.5" aria-hidden="true" />
      </button>
    </motion.div>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within ToastProvider");
  }
  return context;
}
