/**
 * The app's one easing curve, for Framer Motion. Mirrors `--ease-out-soft` in
 * globals.css: entrances decelerate and never overshoot.
 */
export const EASE_OUT = [0.22, 1, 0.36, 1] as const;

/**
 * A spring for physical feedback (layout shifts, chips entering). Critically
 * damped — damping ≥ 2√stiffness — so it settles without the bounce DESIGN.md
 * rules out.
 */
export const SETTLE = { type: "spring", stiffness: 500, damping: 46 } as const;

/** The standard entrance: fade up a few pixels. `delay` staggers siblings. */
export function enter(delay = 0, distance = 10) {
  return {
    initial: { opacity: 0, y: distance },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.4, ease: EASE_OUT, delay },
  } as const;
}
