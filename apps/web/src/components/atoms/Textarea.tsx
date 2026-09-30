import React from "react";
import { cn } from "@/lib/utils";
import Field, { useFieldIds } from "./Field";

interface TextareaProps extends React.ComponentProps<"textarea"> {
  label?: string;
  error?: string;
  hint?: string;
}

export default function Textarea({
  label,
  error,
  hint,
  className,
  id: idProp,
  rows = 4,
  ...props
}: TextareaProps) {
  const { id, errorId, hintId, describedBy, invalid } = useFieldIds(idProp, !!error, !!hint);

  return (
    <Field id={id} label={label} error={error} errorId={errorId} hint={hint} hintId={hintId}>
      <textarea
        id={id}
        rows={rows}
        aria-invalid={invalid}
        aria-describedby={describedBy}
        className={cn(
          "field w-full resize-y px-4 py-3 leading-relaxed",
          error && "field-error",
          className
        )}
        {...props}
      />
    </Field>
  );
}
