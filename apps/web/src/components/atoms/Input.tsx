import React from "react";
import { cn } from "@/lib/utils";
import Field, { useFieldIds } from "./Field";

interface InputProps extends React.ComponentProps<"input"> {
  label?: string;
  error?: string;
  hint?: string;
}

export default function Input({
  label,
  error,
  hint,
  className,
  id: idProp,
  required,
  ...props
}: InputProps) {
  const { id, errorId, hintId, describedBy, invalid } = useFieldIds(idProp, !!error, !!hint);

  return (
    <Field
      id={id}
      label={label}
      error={error}
      errorId={errorId}
      hint={hint}
      hintId={hintId}
      required={required}
    >
      <input
        id={id}
        aria-invalid={invalid}
        aria-describedby={describedBy}
        aria-required={required || undefined}
        className={cn("field w-full appearance-none px-4 py-3", error && "field-error", className)}
        {...props}
      />
    </Field>
  );
}
