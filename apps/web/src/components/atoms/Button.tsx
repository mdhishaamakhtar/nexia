import React from "react";
import { Loader2 } from "lucide-react";
import { motion, type HTMLMotionProps } from "framer-motion";
import { cn } from "@/lib/utils";

type Variant = "primary" | "secondary" | "destructive" | "ghost";
type Size = "sm" | "md";

interface ButtonProps extends Omit<HTMLMotionProps<"button">, "children"> {
  children: React.ReactNode;
  variant?: Variant;
  size?: Size;
  isLoading?: boolean;
}

/**
 * The app's only button. Every call to action goes through it — six pages used
 * to hand-roll their own, which is how a white-on-light-blue CTA at 1.8:1
 * contrast ended up as the primary action on the profiles page.
 *
 * Primary is peach with peach ink (8.6:1). The soft accent tints are never used
 * as a text or icon colour anywhere; see the token block in globals.css.
 */
const VARIANTS: Record<Variant, string> = {
  primary: "bg-(--peach) text-(--peach-ink) border-(--lavender-border) hover:brightness-[0.97]",
  secondary:
    "bg-(--surface) text-(--text-2) border-(--border) hover:bg-(--surface-2) hover:text-(--text-1)",
  destructive: "bg-(--red-bg) text-(--red-ink) border-(--red-border) hover:bg-(--red-bg-hover)",
  ghost: "bg-transparent text-(--text-2) border-transparent hover:bg-(--surface-2)",
};

// Both sizes clear the 44px touch-target floor.
const SIZES: Record<Size, string> = {
  sm: "min-h-11 gap-1.5 px-3.5 text-[13px]",
  md: "min-h-11 gap-2 px-5 text-sm",
};

export default function Button({
  children,
  className,
  variant = "primary",
  size = "md",
  isLoading,
  disabled,
  ...props
}: ButtonProps) {
  const inert = disabled || isLoading;

  return (
    <motion.button
      whileHover={inert ? undefined : { scale: 1.015 }}
      whileTap={inert ? undefined : { scale: 0.985 }}
      transition={{ type: "spring", stiffness: 600, damping: 26 }}
      disabled={inert}
      aria-busy={isLoading || undefined}
      className={cn(
        "relative inline-flex cursor-pointer items-center justify-center rounded-xl border font-semibold",
        "transition-colors duration-150",
        "disabled:cursor-not-allowed disabled:opacity-45",
        VARIANTS[variant],
        SIZES[size],
        className
      )}
      {...props}
    >
      {isLoading && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
      {children}
    </motion.button>
  );
}
