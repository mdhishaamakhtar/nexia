import React, { forwardRef } from "react";
import { cn } from "@/lib/utils";
import Field, { useFieldIds } from "./Field";

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  hint?: string;
}

const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(function Textarea(
  { label, error, hint, className, id: idProp, rows = 4, ...props },
  ref
) {
  const { id, errorId, describedBy, invalid } = useFieldIds(idProp, !!error);

  return (
    <Field id={id} label={label} error={error} errorId={errorId} hint={hint}>
      <textarea
        ref={ref}
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
});

export default Textarea;
