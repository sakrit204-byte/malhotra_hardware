import type { ComponentProps, ElementType, ReactNode } from "react";

import { cn } from "@/lib/cn";

/** Page width. Wide is used for catalogue grids, narrow for reading and forms. */
export function Container({
  width = "default",
  className,
  as: Component = "div",
  ...props
}: ComponentProps<"div"> & {
  width?: "narrow" | "default" | "wide";
  as?: ElementType;
}) {
  return (
    <Component
      className={cn(
        "mx-auto w-full px-5 sm:px-8",
        width === "narrow" && "max-w-3xl",
        width === "default" && "max-w-6xl",
        width === "wide" && "max-w-[96rem]",
        className,
      )}
      {...props}
    />
  );
}

/**
 * Section heading with an optional eyebrow and a trailing action. The eyebrow is
 * decorative context; the heading itself always carries the document outline.
 */
export function SectionHeading({
  eyebrow,
  title,
  description,
  action,
  level = 2,
  className,
}: {
  eyebrow?: string;
  title: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
  level?: 2 | 3;
  className?: string;
}) {
  const Heading = level === 2 ? "h2" : "h3";

  return (
    <div
      className={cn(
        "flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between",
        className,
      )}
    >
      <div className="max-w-2xl">
        {eyebrow ? <p className="eyebrow mb-3">{eyebrow}</p> : null}
        <Heading
          className={cn(
            level === 2 ? "text-title" : "text-2xl",
            "leading-[1.1] text-ink",
          )}
        >
          {title}
        </Heading>
        {description ? (
          <p className="mt-4 leading-relaxed text-ink-soft">{description}</p>
        ) : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}

/** Standard vertical rhythm between page sections. */
export function Section({
  className,
  tone = "surface",
  ...props
}: ComponentProps<"section"> & {
  tone?: "surface" | "sunken" | "inverse" | "brand";
}) {
  return (
    <section
      className={cn(
        "py-24 sm:py-32 lg:py-40",
        tone === "sunken" && "bg-surface-sunken",
        tone === "inverse" && "on-inverse bg-surface-inverse text-ink-inverse",
        // One band of colour on the page. It is the thing that stops a site
        // made of paper and hairlines reading as timid.
        tone === "brand" && "on-brand",
        className,
      )}
      {...props}
    />
  );
}
