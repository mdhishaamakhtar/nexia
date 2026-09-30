import { useId } from "react";
import { cn } from "@/lib/utils";

/**
 * The label + error wrapper shared by every form control. Controls get
 * `aria-invalid` and `aria-describedby` wired to the error (or hint), so screen
 * readers announce the problem with the field.
 */
export function useFieldIds(idProp: string | undefined, hasError: boolean, hasHint = false) {
  const generated = useId();
  const id = idProp ?? generated;
  const errorId = `${id}-error`;
  const hintId = `${id}-hint`;
  return {
    id,
    errorId,
    hintId,
    describedBy: hasError ? errorId : hasHint ? hintId : undefined,
    invalid: hasError || undefined,
  };
}

export default function Field({
  id,
  label,
  labelId,
  error,
  errorId,
  hint,
  hintId,
  required,
  className,
  children,
}: {
  id: string;
  label?: string;
  /** For controls that are not <input>s (custom pickers) and need aria-labelledby. */
  labelId?: string;
  error?: string;
  errorId: string;
  hint?: string;
  hintId?: string;
  required?: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={cn("w-full min-w-0", className)}>
      {label && (
        <label id={labelId} htmlFor={id} className="t-label mb-2 block">
          {label}
          {required && (
            <span className="text-red-ink" aria-hidden="true">
              {" "}
              *
            </span>
          )}
        </label>
      )}
      {children}
      {hint && !error && (
        <p id={hintId} className="mt-1.5 text-xs text-text-3">
          {hint}
        </p>
      )}
      {error && (
        <p id={errorId} role="alert" className="mt-1.5 text-xs font-semibold text-red-ink">
          {error}
        </p>
      )}
    </div>
  );
}
