import React from "react";
import { Loader2 } from "lucide-react";
import { motion, HTMLMotionProps } from "framer-motion";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface ButtonProps extends Omit<HTMLMotionProps<"button">, "children"> {
  children: React.ReactNode;
  variant?: "primary" | "secondary" | "destructive" | "ghost";
  isLoading?: boolean;
}

export default function Button({
  children,
  className,
  variant = "primary",
  isLoading,
  disabled,
  ...props
}: ButtonProps) {
  const variants = {
    primary:
      "bg-(--peach) text-[#1f2937] border-[rgba(124,58,237,0.2)] hover:opacity-95 sticker-chip",
    secondary:
      "bg-(--fill) border-(--border) text-(--text-2) hover:bg-(--fill-hover) hover:text-(--text-1)",
    destructive:
      "bg-[rgba(255,59,48,0.08)] border-[rgba(255,59,48,0.18)] text-(--red) hover:bg-[rgba(255,59,48,0.15)]",
    ghost:
      "bg-transparent border-transparent text-(--text-3) hover:text-(--text-2) hover:bg-(--fill)",
  };

  return (
    <motion.button
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.97 }}
      disabled={isLoading || disabled}
      className={cn(
        "relative flex items-center justify-center px-5 py-2.5 rounded-xl font-medium transition-all duration-200 border disabled:opacity-40 disabled:cursor-not-allowed text-sm",
        variants[variant],
        className
      )}
      {...props}
    >
      {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
      {children}
    </motion.button>
  );
}
