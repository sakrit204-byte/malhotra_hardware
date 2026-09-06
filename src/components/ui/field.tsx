import type { ComponentProps, ReactNode } from "react";

import { cn } from "@/lib/cn";

/**
 * Accessible form field wiring.
 *
 * Field owns the identifiers so that a label, a hint and an error message are
 * always connected to the control by `id` and `aria-describedby`, and so that
 * an invalid control always reports `aria-invalid`. The control is supplied
 * through a render prop, which keeps the whole field a server component and
 * makes the connection impossible to forget.
 */

export type FieldControlProps = {
  id: string;
  name: string;
  required?: boolean;
  "aria-describedby"?: string;
  "aria-invalid"?: true;
};

type FieldProps = {
  name: string;
  label: string;
  hint?: ReactNode;
  error?: string;
  required?: boolean;
  className?: string;
  /** Visually hides the label while keeping it available to screen readers. */
  hideLabel?: boolean;
  children: (control: FieldControlProps) => ReactNode;
};

export function Field({
  name,
  label,
  hint,
  error,
  required,
  className,
  hideLabel = false,
  children,
}: FieldProps) {
  const id = `field-${name}`;
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const describedBy = [hintId, errorId].filter(Boolean).join(" ") || undefined;

  return (
    <div className={cn("space-y-1.5", className)}>
      <label
        htmlFor={id}
        className={cn(
          "block text-[0.875rem] font-medium text-ink",
          hideLabel && "sr-only",
        )}
      >
        {label}
        {required ? (
          <span className="ml-1 text-critical" aria-hidden="true">
            *
          </span>
        ) : null}
        {required ? <span className="sr-only"> (required)</span> : null}
      </label>

      {children({
        id,
        name,
        required,
        "aria-describedby": describedBy,
        ...(error ? { "aria-invalid": true as const } : {}),
      })}

      {/*
        The hint sits under the control rather than above it. Two fields side by
        side in a grid, only one of them carrying a hint, would otherwise have
        their inputs at different heights, and the eye reads that as a mistake.
      */}
      {hint ? (
        <p id={hintId} className="text-[0.8125rem] text-ink-muted">
          {hint}
        </p>
      ) : null}

      {error ? (
        <p
          id={errorId}
          className="flex items-start gap-1.5 text-[0.8125rem] text-critical"
        >
          <span aria-hidden="true">!</span>
          <span>{error}</span>
        </p>
      ) : null}
    </div>
  );
}

const controlStyles = [
  "w-full border border-line-strong bg-surface-raised px-3.5 text-[0.9375rem] text-ink",
  "placeholder:text-ink-muted",
  "transition-[border-color,box-shadow,background-color] duration-[--duration-quick] ease-[--ease-quiet]",
  "hover:border-ink-muted",
  "focus:border-brand focus:shadow-[0_0_0_3px_var(--color-brand-wash)] focus:outline-none",
  "aria-[invalid=true]:border-critical aria-[invalid=true]:focus:shadow-[0_0_0_3px_var(--color-critical-wash)]",
  "disabled:cursor-not-allowed disabled:bg-surface-sunken disabled:text-ink-muted",
];

export function Input({ className, ...props }: ComponentProps<"input">) {
  return <input className={cn(controlStyles, "h-11", className)} {...props} />;
}

export function Textarea({ className, ...props }: ComponentProps<"textarea">) {
  return (
    <textarea
      className={cn(controlStyles, "min-h-28 resize-y py-3 leading-relaxed", className)}
      {...props}
    />
  );
}

export function Select({ className, children, ...props }: ComponentProps<"select">) {
  return (
    <select className={cn(controlStyles, "h-11 pr-9", className)} {...props}>
      {children}
    </select>
  );
}

/**
 * Summary of everything wrong with a submitted form. Focus moves here after a
 * failed submission so a screen reader reader hears the problem immediately.
 */
export function FormErrorSummary({
  title,
  errors,
  className,
}: {
  title: string;
  errors: string[];
  className?: string;
}) {
  if (errors.length === 0) return null;

  return (
    <div
      role="alert"
      tabIndex={-1}
      className={cn(
        "rounded-md border border-critical/30 bg-critical-wash px-4 py-3",
        className,
      )}
    >
      <p className="text-sm font-medium text-critical">{title}</p>
      <ul className="mt-1.5 list-disc space-y-1 pl-5 text-[0.8125rem] text-ink-soft">
        {errors.map((message) => (
          <li key={message}>{message}</li>
        ))}
      </ul>
    </div>
  );
}
