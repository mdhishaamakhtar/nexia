"use client";

import { useCallback, useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Check, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { useDismiss } from "@/shared/hooks/use-dismiss";
import { EASE_OUT } from "@/shared/ui/motion";
import Field, { useFieldIds } from "./Field";

export interface SelectOption<V extends string = string> {
  value: V;
  label: string;
}

interface SelectProps<V extends string> {
  value: V;
  onChange: (value: V) => void;
  options: readonly SelectOption<V>[];
  label?: string;
  /** For a select without a visible label (a filter bar). */
  "aria-label"?: string;
  error?: string;
  hint?: string;
  id?: string;
  onBlur?: () => void;
  disabled?: boolean;
  className?: string;
}

/**
 * A dropdown drawn in the app's own paper rather than the operating system's
 * menu. It follows the WAI-ARIA listbox pattern: the trigger opens a list that
 * takes focus, arrow keys, Home/End and typing a letter move through it, Enter
 * or Space picks, Escape closes and returns focus to the trigger. Typing a
 * letter on the closed trigger changes the value directly, as a native select
 * does.
 */
export default function Select<V extends string>({
  value,
  onChange,
  options,
  label,
  "aria-label": ariaLabel,
  error,
  hint,
  id: idProp,
  onBlur,
  disabled,
  className,
}: SelectProps<V>) {
  const { id, errorId, hintId, describedBy, invalid } = useFieldIds(idProp, !!error, !!hint);
  const labelId = `${id}-label`;
  const listId = useId();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);

  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const [placeAbove, setPlaceAbove] = useState(false);

  const selectedIndex = Math.max(
    0,
    options.findIndex((o) => o.value === value)
  );
  const selected = options[selectedIndex];

  const close = useCallback(
    (refocus: boolean) => {
      setOpen(false);
      if (refocus) triggerRef.current?.focus();
      onBlur?.();
    },
    [onBlur]
  );

  const dismissRefs = useMemo(() => [wrapperRef], []);
  const dismiss = useCallback(() => close(false), [close]);
  useDismiss(dismissRefs, open, dismiss);

  const openList = (at = selectedIndex) => {
    if (disabled) return;
    setActive(at);
    setOpen(true);
  };

  const choose = (index: number) => {
    const option = options[index];
    if (option && option.value !== value) onChange(option.value);
    close(true);
  };

  // Flip above the trigger when there isn't room below for the list.
  useLayoutEffect(() => {
    if (!open || !triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const listHeight = Math.min(options.length * 44 + 12, 272);
    setPlaceAbove(window.innerHeight - rect.bottom < listHeight + 8 && rect.top > listHeight + 8);
  }, [open, options.length]);

  useEffect(() => {
    if (open) listRef.current?.focus();
  }, [open]);

  useEffect(() => {
    if (!open) return;
    listRef.current
      ?.querySelector<HTMLElement>(`[data-index="${active}"]`)
      ?.scrollIntoView({ block: "nearest" });
  }, [active, open]);

  /** Index of the next option whose label starts with `char`, after `from`. */
  const matchFrom = (char: string, from: number) => {
    const lower = char.toLowerCase();
    for (let step = 1; step <= options.length; step++) {
      const i = (from + step) % options.length;
      if (options[i]!.label.toLowerCase().startsWith(lower)) return i;
    }
    return -1;
  };

  const onTriggerKeyDown = (e: React.KeyboardEvent) => {
    if (["ArrowDown", "ArrowUp", "Enter", " "].includes(e.key)) {
      e.preventDefault();
      openList();
    } else if (e.key.length === 1 && /\S/.test(e.key)) {
      const match = matchFrom(e.key, selectedIndex);
      if (match >= 0) onChange(options[match]!.value);
    }
  };

  const onListKeyDown = (e: React.KeyboardEvent) => {
    const last = options.length - 1;
    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setActive((i) => Math.min(last, i + 1));
        break;
      case "ArrowUp":
        e.preventDefault();
        setActive((i) => Math.max(0, i - 1));
        break;
      case "Home":
        e.preventDefault();
        setActive(0);
        break;
      case "End":
        e.preventDefault();
        setActive(last);
        break;
      case "Enter":
      case " ":
        e.preventDefault();
        choose(active);
        break;
      case "Escape":
        e.preventDefault();
        e.stopPropagation();
        close(true);
        break;
      case "Tab":
        close(false);
        break;
      default:
        if (e.key.length === 1 && /\S/.test(e.key)) {
          const match = matchFrom(e.key, active);
          if (match >= 0) setActive(match);
        }
    }
  };

  return (
    <Field
      id={id}
      label={label}
      labelId={labelId}
      error={error}
      errorId={errorId}
      hint={hint}
      hintId={hintId}
      className={className}
    >
      <div ref={wrapperRef} className="relative">
        <button
          ref={triggerRef}
          id={id}
          type="button"
          role="combobox"
          aria-haspopup="listbox"
          aria-expanded={open}
          aria-controls={listId}
          aria-labelledby={label ? `${labelId} ${id}` : undefined}
          aria-label={label ? undefined : ariaLabel}
          aria-invalid={invalid}
          aria-describedby={describedBy}
          disabled={disabled}
          onClick={() => (open ? close(false) : openList())}
          onKeyDown={onTriggerKeyDown}
          className={cn(
            "field flex w-full cursor-pointer items-center justify-between gap-3 py-3 pl-4 pr-3.5 text-left",
            error && "field-error"
          )}
        >
          <span className="truncate">{selected?.label}</span>
          <ChevronDown
            className={cn(
              "h-4 w-4 shrink-0 text-text-3 transition-transform duration-150",
              open && "rotate-180"
            )}
            aria-hidden="true"
          />
        </button>

        <AnimatePresence>
          {open && (
            <motion.ul
              ref={listRef}
              id={listId}
              role="listbox"
              tabIndex={-1}
              aria-labelledby={label ? labelId : undefined}
              aria-label={label ? undefined : ariaLabel}
              aria-activedescendant={`${listId}-${active}`}
              onKeyDown={onListKeyDown}
              initial={{ opacity: 0, y: placeAbove ? 4 : -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.14, ease: EASE_OUT }}
              className={cn(
                "paper-float absolute left-0 right-0 z-40 max-h-[17rem] overflow-y-auto rounded-xl p-1.5 outline-none",
                placeAbove ? "bottom-full mb-1.5" : "top-full mt-1.5"
              )}
            >
              {options.map((option, index) => {
                const isSelected = option.value === value;
                return (
                  <li
                    key={option.value}
                    id={`${listId}-${index}`}
                    data-index={index}
                    role="option"
                    aria-selected={isSelected}
                    onPointerEnter={() => setActive(index)}
                    onClick={() => choose(index)}
                    className={cn(
                      "flex min-h-11 cursor-pointer items-center justify-between gap-3 rounded-lg px-3 text-[15px] text-text-2",
                      index === active && "bg-surface-2 text-text-1",
                      isSelected && "font-semibold text-text-1"
                    )}
                  >
                    <span className="truncate">{option.label}</span>
                    {isSelected && (
                      <Check className="h-4 w-4 shrink-0 text-lavender-ink" aria-hidden="true" />
                    )}
                  </li>
                );
              })}
            </motion.ul>
          )}
        </AnimatePresence>
      </div>
    </Field>
  );
}
