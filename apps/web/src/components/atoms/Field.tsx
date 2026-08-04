import { useId } from "react";

/**
 * The label + error wrapper shared by every form control.
 *
 * Labels and error text used to be re-declared inline on roughly a dozen
 * fields with slightly different sizes and tracking; this is the one source
 * for both. Controls get `aria-invalid` and `aria-describedby` wired to the
 * error automatically, so screen readers announce the problem.
 */
export function useFieldIds(idProp: string | undefined, hasError: boolean) {
  const generated = useId();
  const id = idProp ?? generated;
  const errorId = `${id}-error`;
  return {
    id,
    errorId,
    describedBy: hasError ? errorId : undefined,
    invalid: hasError || undefined,
  };
}

export default function Field({
  id,
  label,
  error,
  errorId,
  hint,
  className = "",
  children,
}: {
  id: string;
  label?: string;
  error?: string;
  errorId: string;
  hint?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={`w-full min-w-0 ${className}`.trim()}>
      {label && (
        <label htmlFor={id} className="t-label mb-2 block">
          {label}
        </label>
      )}
      {children}
      {hint && !error && (
        <p className="mt-1.5 text-xs" style={{ color: "var(--text-3)" }}>
          {hint}
        </p>
      )}
      {error && (
        <p
          id={errorId}
          role="alert"
          className="mt-1.5 text-xs font-semibold"
          style={{ color: "var(--red-ink)" }}
        >
          {error}
        </p>
      )}
    </div>
  );
}
