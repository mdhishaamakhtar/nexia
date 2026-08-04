import React, { forwardRef } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import Field, { useFieldIds } from "./Field";

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  hint?: string;
  options: readonly { value: string; label: string }[];
}

/**
 * A native `<select>` with the app's field styling and a drawn chevron.
 * Native is deliberate: it gets platform-correct keyboard behaviour and the
 * iOS wheel picker for free, which no custom listbox here would match.
 */
const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select(
  { label, error, hint, className, id: idProp, options, ...props },
  ref
) {
  const { id, errorId, describedBy, invalid } = useFieldIds(idProp, !!error);

  return (
    <Field id={id} label={label} error={error} errorId={errorId} hint={hint}>
      <div className="relative">
        <select
          ref={ref}
          id={id}
          aria-invalid={invalid}
          aria-describedby={describedBy}
          className={cn(
            "field w-full cursor-pointer appearance-none py-3 pl-4 pr-11",
            error && "field-error",
            className
          )}
          {...props}
        >
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <ChevronDown
          className="pointer-events-none absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2"
          style={{ color: "var(--text-3)" }}
          aria-hidden="true"
        />
      </div>
    </Field>
  );
});

export default Select;
