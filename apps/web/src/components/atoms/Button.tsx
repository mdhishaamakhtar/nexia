import React from "react";
import Link from "next/link";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

type Variant = "primary" | "secondary" | "destructive" | "ghost";
type Size = "sm" | "md" | "lg" | "icon";

/**
 * The app's only button — and, with `href`, the only button-shaped link. Six
 * pages used to hand-roll their own, which is how a white-on-light-blue CTA at
 * 1.8:1 once became the primary action on the profiles page.
 *
 * Primary is peach with peach ink (5.6:1) and a peach hairline. The soft accent
 * tints are never a text or icon colour anywhere; see globals.css.
 *
 * Press feedback is a CSS scale on the one ease-out curve. No spring: DESIGN.md
 * rules out overshoot, and a CSS transition costs nothing per button.
 */
const VARIANTS: Record<Variant, string> = {
  primary: "bg-peach text-peach-ink border-peach-line hover:brightness-[0.97]",
  secondary: "bg-surface text-text-2 border-line-mid hover:bg-surface-2 hover:text-text-1",
  destructive: "bg-red-bg text-red-ink border-red-border hover:bg-red-bg-hover",
  ghost: "bg-transparent text-text-2 border-transparent hover:bg-surface-2 hover:text-text-1",
};

// Every size clears the 44px touch-target floor.
const SIZES: Record<Size, string> = {
  sm: "min-h-11 gap-1.5 px-3.5 text-[13px]",
  md: "min-h-11 gap-2 px-5 text-sm",
  lg: "min-h-12 gap-2 px-8 text-sm font-bold",
  icon: "h-11 w-11 shrink-0",
};

const BASE =
  "relative inline-flex cursor-pointer select-none items-center justify-center rounded-xl border font-semibold " +
  "transition-[transform,background-color,color,filter] duration-150 ease-out active:scale-[0.98] " +
  "disabled:pointer-events-none disabled:opacity-45 aria-disabled:pointer-events-none aria-disabled:opacity-45";

interface CommonProps {
  children: React.ReactNode;
  variant?: Variant;
  size?: Size;
  className?: string;
}

type ButtonProps = CommonProps &
  Omit<React.ComponentProps<"button">, "className" | "children"> & {
    href?: undefined;
    isLoading?: boolean;
  };

type LinkProps = CommonProps &
  Omit<React.ComponentProps<typeof Link>, "className" | "children"> & {
    href: string;
  };

export function buttonClasses(variant: Variant = "primary", size: Size = "md", className?: string) {
  return cn(BASE, VARIANTS[variant], SIZES[size], className);
}

export default function Button(props: ButtonProps | LinkProps) {
  if (props.href !== undefined) {
    const { children, variant, size, className, ...link } = props as LinkProps;
    return (
      <Link {...link} className={buttonClasses(variant, size, className)}>
        {children}
      </Link>
    );
  }

  const {
    children,
    variant,
    size,
    className,
    isLoading,
    disabled,
    type = "button",
    ...rest
  } = props as ButtonProps;
  return (
    <button
      type={type}
      disabled={disabled || isLoading}
      aria-busy={isLoading || undefined}
      className={buttonClasses(variant, size, className)}
      {...rest}
    >
      {isLoading && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
      {children}
    </button>
  );
}
