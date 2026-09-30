"use client";

import { useCallback, useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { CalendarDays, ChevronLeft, ChevronRight, X } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  addDays,
  addMonths,
  daysInMonth,
  formatDate,
  monthName,
  parseISODate,
  sameDate,
  toISODate,
  todayDate,
  weekdayIndex,
  weekdayNames,
  type CalendarDate,
} from "@/shared/lib/dates";
import { useDismiss } from "@/shared/hooks/use-dismiss";
import { EASE_OUT } from "@/shared/ui/motion";
import Field, { useFieldIds } from "./Field";

type View = "days" | "months" | "years";

const EARLIEST_YEAR = 1900;

function compare(a: CalendarDate, b: CalendarDate): number {
  return a.year - b.year || a.month - b.month || a.day - b.day;
}

/**
 * A calendar drawn on the app's paper instead of the browser's date input,
 * which renders differently on every platform and can't be styled to match.
 *
 * Birthdays are usually decades back, so the month/year heading opens a year
 * grid and then a month grid; with no date set yet it starts there. The day
 * grid follows the WAI-ARIA date picker pattern: one day is focusable, arrow
 * keys move by day and week, Page Up/Down by month (with Shift, by year),
 * Home/End to the ends of the week, Enter picks, Escape closes.
 *
 * The value is a plain "YYYY-MM-DD" string, or "" for no date.
 */
export default function DatePicker({
  value,
  onChange,
  label,
  error,
  hint,
  id: idProp,
  onBlur,
  max,
  placeholder = "Pick a date",
  className,
}: {
  value: string;
  onChange: (value: string) => void;
  label?: string;
  error?: string;
  hint?: string;
  id?: string;
  onBlur?: () => void;
  /** Latest selectable date, as "YYYY-MM-DD". */
  max?: string;
  placeholder?: string;
  className?: string;
}) {
  const { id, errorId, hintId, describedBy } = useFieldIds(idProp, !!error, !!hint);
  const labelId = `${id}-label`;
  const dialogId = useId();
  const wrapperRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  const selected = parseISODate(value);
  const maxDate = parseISODate(max) ?? null;
  const [open, setOpen] = useState(false);
  const [view, setView] = useState<View>("days");
  const [focused, setFocused] = useState<CalendarDate>(() => selected ?? todayDate());
  const [placeAbove, setPlaceAbove] = useState(false);
  /**
   * Set when a change should carry keyboard focus into the grid (opening,
   * switching view, arrow keys). Clicking the month arrows leaves it alone, so
   * focus stays on the arrow for the next press.
   */
  const moveFocus = useRef(false);
  const focusDate = (date: CalendarDate) => {
    moveFocus.current = true;
    setFocused(date);
  };
  const showView = (next: View) => {
    moveFocus.current = true;
    setView(next);
  };

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

  const openPicker = () => {
    const start =
      selected ?? (maxDate && compare(maxDate, todayDate()) < 0 ? maxDate : todayDate());
    focusDate(start);
    // Nothing chosen yet: a birthday is years away from today, so start with
    // the year rather than making someone page back month by month.
    setView(selected ? "days" : "years");
    setOpen(true);
  };

  useLayoutEffect(() => {
    if (!open || !triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    setPlaceAbove(window.innerHeight - rect.bottom < 400 && rect.top > 400);
  }, [open]);

  // Carry keyboard focus to the focused cell of whichever grid is showing.
  useEffect(() => {
    if (!open || !moveFocus.current) return;
    moveFocus.current = false;
    const cell = panelRef.current?.querySelector<HTMLElement>('[data-focus="true"]');
    cell?.focus({ preventScroll: view !== "years" });
    if (view === "years") cell?.scrollIntoView({ block: "center" });
  }, [open, view, focused]);

  const isDisabled = (date: CalendarDate) => !!maxDate && compare(date, maxDate) > 0;

  const pick = (date: CalendarDate) => {
    if (isDisabled(date)) return;
    onChange(toISODate(date));
    close(true);
  };

  const onGridKeyDown = (e: React.KeyboardEvent) => {
    const moves: Record<string, () => CalendarDate> = {
      ArrowLeft: () => addDays(focused, -1),
      ArrowRight: () => addDays(focused, 1),
      ArrowUp: () => addDays(focused, -7),
      ArrowDown: () => addDays(focused, 7),
      PageUp: () => addMonths(focused, e.shiftKey ? -12 : -1),
      PageDown: () => addMonths(focused, e.shiftKey ? 12 : 1),
      Home: () => addDays(focused, -weekdayIndex(focused)),
      End: () => addDays(focused, 6 - weekdayIndex(focused)),
    };
    const move = moves[e.key];
    if (move) {
      e.preventDefault();
      focusDate(move());
    } else if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      pick(focused);
    }
  };

  const onPanelKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      e.preventDefault();
      e.stopPropagation();
      if (view !== "days") showView("days");
      else close(true);
    }
  };

  const today = todayDate();
  const weekdays = useMemo(() => weekdayNames(), []);
  const monthStart = { ...focused, day: 1 };
  const leading = weekdayIndex(monthStart);
  const days = daysInMonth(focused.year, focused.month);
  const lastYear = maxDate?.year ?? today.year + 10;
  const years = Array.from({ length: lastYear - EARLIEST_YEAR + 1 }, (_, i) => lastYear - i);

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
          aria-haspopup="dialog"
          aria-expanded={open}
          aria-controls={dialogId}
          aria-labelledby={label ? `${labelId} ${id}` : undefined}
          aria-describedby={describedBy}
          onClick={() => (open ? close(false) : openPicker())}
          className={cn(
            "field flex w-full cursor-pointer items-center gap-3 py-3 pl-4 pr-12 text-left",
            error && "field-error"
          )}
        >
          <CalendarDays className="h-4 w-4 shrink-0 text-text-3" aria-hidden="true" />
          <span className={cn("truncate", !selected && "text-text-3")}>
            {formatDate(value, "long") ?? placeholder}
          </span>
        </button>
        {selected && (
          <button
            type="button"
            onClick={() => {
              onChange("");
              triggerRef.current?.focus();
            }}
            aria-label={`Clear ${label ? label.toLowerCase() : "date"}`}
            className="hit-44 absolute right-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full text-text-3 transition-colors hover:bg-surface-2 hover:text-text-1"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        )}

        <AnimatePresence>
          {open && (
            <motion.div
              ref={panelRef}
              id={dialogId}
              role="dialog"
              aria-modal="false"
              aria-label={label ? `Choose ${label.toLowerCase()}` : "Choose a date"}
              onKeyDown={onPanelKeyDown}
              initial={{ opacity: 0, y: placeAbove ? 4 : -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.14, ease: EASE_OUT }}
              className={cn(
                // On a phone the field is narrower than the calendar, so the
                // panel reaches out to the card's edges instead of the screen's.
                "paper-float absolute -inset-x-5 z-40 rounded-2xl p-3 sm:inset-x-auto sm:left-0 sm:w-[20.75rem]",
                placeAbove ? "bottom-full mb-1.5" : "top-full mt-1.5"
              )}
            >
              <div className="mb-2 flex items-center justify-between gap-1">
                <button
                  type="button"
                  onClick={() => setFocused(addMonths(focused, view === "days" ? -1 : -12))}
                  aria-label={view === "days" ? "Previous month" : "Previous year"}
                  className={cn(
                    "flex h-11 w-11 items-center justify-center rounded-xl text-text-2 transition-colors hover:bg-surface-2",
                    view === "years" && "invisible"
                  )}
                >
                  <ChevronLeft className="h-4 w-4" aria-hidden="true" />
                </button>
                <button
                  type="button"
                  onClick={() => showView(view === "days" ? "years" : "days")}
                  aria-live="polite"
                  className="flex min-h-11 items-center rounded-xl px-3 text-[15px] font-bold text-text-1 transition-colors hover:bg-surface-2"
                >
                  {view === "years"
                    ? "Pick a year"
                    : view === "months"
                      ? focused.year
                      : `${monthName(focused.month)} ${focused.year}`}
                </button>
                <button
                  type="button"
                  onClick={() => setFocused(addMonths(focused, view === "days" ? 1 : 12))}
                  aria-label={view === "days" ? "Next month" : "Next year"}
                  className={cn(
                    "flex h-11 w-11 items-center justify-center rounded-xl text-text-2 transition-colors hover:bg-surface-2",
                    view === "years" && "invisible"
                  )}
                >
                  <ChevronRight className="h-4 w-4" aria-hidden="true" />
                </button>
              </div>

              {view === "days" && (
                <div
                  role="grid"
                  aria-label={`${monthName(focused.month)} ${focused.year}`}
                  onKeyDown={onGridKeyDown}
                >
                  <div role="row" className="grid grid-cols-7">
                    {weekdays.map((name, i) => (
                      <span
                        key={i}
                        role="columnheader"
                        className="t-label flex h-8 items-center justify-center"
                      >
                        {name}
                      </span>
                    ))}
                  </div>
                  <div className="grid grid-cols-7">
                    {Array.from({ length: leading }, (_, i) => (
                      <span key={`blank-${i}`} aria-hidden="true" />
                    ))}
                    {Array.from({ length: days }, (_, i) => {
                      const date = { year: focused.year, month: focused.month, day: i + 1 };
                      const isFocused = date.day === focused.day;
                      const isSelected = sameDate(date, selected);
                      const isToday = sameDate(date, today);
                      const disabled = isDisabled(date);
                      return (
                        <span key={i} role="gridcell" aria-selected={isSelected}>
                          <button
                            type="button"
                            tabIndex={isFocused ? 0 : -1}
                            data-focus={isFocused}
                            disabled={disabled}
                            onClick={() => pick(date)}
                            aria-label={formatDate(toISODate(date), "long") ?? undefined}
                            aria-current={isToday ? "date" : undefined}
                            className={cn(
                              "flex h-11 w-11 items-center justify-center rounded-xl text-sm font-semibold text-text-2 transition-colors hover:bg-surface-2 disabled:opacity-30",
                              isToday &&
                                !isSelected &&
                                "border border-lavender-line text-lavender-ink",
                              isSelected && "bg-peach text-peach-ink hover:bg-peach"
                            )}
                          >
                            {date.day}
                          </button>
                        </span>
                      );
                    })}
                  </div>
                </div>
              )}

              {view === "years" && (
                <div
                  role="listbox"
                  aria-label="Year"
                  className="grid max-h-64 grid-cols-4 gap-1 overflow-y-auto"
                >
                  {years.map((year) => {
                    const isFocused = year === focused.year;
                    return (
                      <button
                        key={year}
                        type="button"
                        role="option"
                        aria-selected={selected?.year === year}
                        tabIndex={isFocused ? 0 : -1}
                        data-focus={isFocused}
                        onClick={() => {
                          setFocused({
                            ...focused,
                            year,
                            day: Math.min(focused.day, daysInMonth(year, focused.month)),
                          });
                          showView("months");
                        }}
                        onKeyDown={(e) => {
                          const step = { ArrowLeft: 1, ArrowRight: -1, ArrowUp: 4, ArrowDown: -4 }[
                            e.key
                          ];
                          if (step) {
                            e.preventDefault();
                            const next = Math.min(lastYear, Math.max(EARLIEST_YEAR, year + step));
                            focusDate({ ...focused, year: next });
                          }
                        }}
                        className={cn(
                          "min-h-11 rounded-xl text-sm font-semibold text-text-2 transition-colors hover:bg-surface-2",
                          selected?.year === year && "bg-peach text-peach-ink hover:bg-peach"
                        )}
                      >
                        {year}
                      </button>
                    );
                  })}
                </div>
              )}

              {view === "months" && (
                <div role="listbox" aria-label="Month" className="grid grid-cols-3 gap-1">
                  {Array.from({ length: 12 }, (_, i) => i + 1).map((month) => {
                    const isFocused = month === focused.month;
                    const disabled =
                      !!maxDate &&
                      (focused.year > maxDate.year ||
                        (focused.year === maxDate.year && month > maxDate.month));
                    return (
                      <button
                        key={month}
                        type="button"
                        role="option"
                        aria-selected={selected?.year === focused.year && selected.month === month}
                        tabIndex={isFocused ? 0 : -1}
                        data-focus={isFocused}
                        disabled={disabled}
                        onClick={() => {
                          setFocused({
                            ...focused,
                            month,
                            day: Math.min(focused.day, daysInMonth(focused.year, month)),
                          });
                          showView("days");
                        }}
                        onKeyDown={(e) => {
                          const step = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -3, ArrowDown: 3 }[
                            e.key
                          ];
                          if (step) {
                            e.preventDefault();
                            const next = Math.min(12, Math.max(1, month + step));
                            focusDate({
                              ...focused,
                              month: next,
                              day: Math.min(focused.day, daysInMonth(focused.year, next)),
                            });
                          }
                        }}
                        className="min-h-11 rounded-xl text-sm font-semibold text-text-2 transition-colors hover:bg-surface-2 disabled:opacity-30"
                      >
                        {monthName(month, undefined, "short")}
                      </button>
                    );
                  })}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </Field>
  );
}
