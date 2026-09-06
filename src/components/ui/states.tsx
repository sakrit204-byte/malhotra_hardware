import type { ComponentProps, ReactNode } from "react";

import { cn } from "@/lib/cn";

/**
 * Loading, empty and error presentation.
 *
 * Every list, table and grid in the application uses these three so that a
 * customer never meets a blank rectangle and never meets a stack trace.
 */

export function Skeleton({ className, ...props }: ComponentProps<"div">) {
  return (
    <div
      className={cn(
        "animate-pulse rounded-md bg-surface-sunken",
        "motion-reduce:animate-none",
        className,
      )}
      {...props}
    />
  );
}

/** Announces background work to assistive technology without stealing focus. */
export function LoadingRegion({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div role="status" aria-live="polite" aria-busy="true">
      <span className="sr-only">{label}</span>
      {children}
    </div>
  );
}

/**
 * An empty or failed state owns a real heading, at whatever level the page
 * needs. Defaulting to a second level heading keeps the outline honest when a
 * list is empty: a page never jumps from its title straight to a third level.
 */
type HeadingLevel = 1 | 2 | 3;

export function EmptyState({
  title,
  description,
  action,
  className,
  level = 2,
}: {
  title: string;
  description?: ReactNode;
  action?: ReactNode;
  className?: string;
  level?: HeadingLevel;
}) {
  const Heading = `h${level}` as const;

  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center rounded-lg border border-dashed border-line-strong bg-surface-raised px-6 py-16 text-center",
        className,
      )}
    >
      <Heading className="text-lg text-ink">{title}</Heading>
      {description ? (
        <p className="mt-2 max-w-md text-sm leading-relaxed text-ink-soft">
          {description}
        </p>
      ) : null}
      {action ? <div className="mt-6">{action}</div> : null}
    </div>
  );
}

export function ErrorState({
  title = "Something went wrong",
  description,
  action,
  className,
  level = 2,
}: {
  title?: string;
  description?: ReactNode;
  action?: ReactNode;
  className?: string;
  level?: HeadingLevel;
}) {
  const Heading = `h${level}` as const;

  return (
    <div
      role="alert"
      className={cn(
        "rounded-lg border border-critical/25 bg-critical-wash px-6 py-8 text-center",
        className,
      )}
    >
      <Heading className="text-lg text-ink">{title}</Heading>
      {description ? (
        <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-ink-soft">
          {description}
        </p>
      ) : null}
      {action ? <div className="mt-6">{action}</div> : null}
    </div>
  );
}
