import type { ComponentProps, ReactNode } from "react";

import { cn } from "@/lib/cn";

/**
 * The drawing sheet.
 *
 * The page borrows the conventions of a general arrangement drawing: setting
 * out lines behind the content, a title block at the head of each sheet,
 * dimensions taken off the object itself, and notes lettered in a monospace
 * beside what they describe.
 *
 * The conventions are load bearing rather than decorative. A dimension shows a
 * real measurement held on the product, and a note carries the product code a
 * customer will quote on the telephone. Nothing here is drawn for the look of
 * it, which is what keeps it from reading as a costume.
 */

/** A short measured rule with end ticks and a lettered value. */
export function Dimension({
  value,
  orientation = "horizontal",
  className,
  ...props
}: Omit<ComponentProps<"div">, "children"> & {
  value: string;
  orientation?: "horizontal" | "vertical";
}) {
  if (orientation === "vertical") {
    return (
      <div
        className={cn("flex w-4 flex-col items-center gap-2", className)}
        aria-hidden="true"
        {...props}
      >
        <span className="h-px w-3 bg-line-strong" />
        <span className="w-px flex-1 bg-line-strong" />
        <span className="note whitespace-nowrap [writing-mode:vertical-rl]">{value}</span>
        <span className="w-px flex-1 bg-line-strong" />
        <span className="h-px w-3 bg-line-strong" />
      </div>
    );
  }

  return (
    <div
      className={cn("flex items-center gap-3", className)}
      aria-hidden="true"
      {...props}
    >
      <span className="h-2.5 w-px bg-line-strong" />
      <span className="h-px flex-1 bg-line-strong" />
      <span className="note whitespace-nowrap">{value}</span>
      <span className="h-px flex-1 bg-line-strong" />
      <span className="h-2.5 w-px bg-line-strong" />
    </div>
  );
}

/**
 * The title block at the head of a section.
 *
 * The subject in lettering on a rule, then the heading itself set large. The
 * rule runs the full width because on a drawing it always does, and it is what
 * gives a long page its horizontal structure.
 */
export function TitleBlock({
  label,
  title,
  description,
  action,
  tone = "ink",
  level = 2,
  className,
}: {
  label: string;
  title: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
  tone?: "ink" | "inverse";
  level?: 2 | 3;
  className?: string;
}) {
  const Heading = level === 2 ? "h2" : "h3";
  const inverse = tone === "inverse";

  return (
    <div className={className}>
      <div
        className={cn(
          "flex items-center gap-4 border-t pt-3",
          inverse ? "border-line-inverse" : "border-ink",
        )}
      >
        <p className={cn("note shrink-0", inverse && "text-ink-inverse-soft")}>{label}</p>
        {action ? <div className="ms-auto shrink-0">{action}</div> : null}
      </div>

      <div className="mt-8 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between lg:gap-16">
        <Heading
          className={cn(
            "max-w-[16ch] text-title",
            inverse ? "text-ink-inverse" : "text-ink",
          )}
        >
          {title}
        </Heading>

        {description ? (
          <p
            className={cn(
              "max-w-md text-[0.9375rem] leading-relaxed lg:pb-2",
              inverse ? "text-ink-inverse-soft" : "text-ink-soft",
            )}
          >
            {description}
          </p>
        ) : null}
      </div>
    </div>
  );
}

/**
 * A note lettered against a hairline, the way a callout sits beside a detail.
 * The rule points at what the note describes, so the pair reads as one mark
 * rather than as a caption that happens to be nearby.
 */
export function Note({
  children,
  className,
  ...props
}: ComponentProps<"p">) {
  return (
    <p className={cn("note flex items-center gap-2.5", className)} {...props}>
      <span className="h-px w-6 shrink-0 bg-line-strong" aria-hidden="true" />
      {children}
    </p>
  );
}

/**
 * A plate: a photograph registered on the sheet with corner ticks rather than
 * boxed in by a border. Square corners throughout, because a drawing has no
 * rounded ones.
 */
export function Plate({
  className,
  frameClassName,
  children,
  ...props
}: ComponentProps<"div"> & { frameClassName?: string }) {
  return (
    <div className={cn("ticked relative", className)} {...props}>
      {/* The image is clipped by an inner frame so the registration marks,
          which sit outside it, are never cut off by the clip. */}
      <div
        className={cn(
          "relative h-full w-full overflow-hidden bg-surface-sunken",
          frameClassName,
        )}
      >
        {children}
      </div>
    </div>
  );
}
