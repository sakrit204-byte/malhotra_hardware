import { cva, type VariantProps } from "class-variance-authority";
import type { ComponentProps } from "react";

import { cn } from "@/lib/cn";

/**
 * Small rectangular label for a status or an attribute.
 *
 * Colour is never the only signal. A chip always carries its own words, so it
 * stays readable in greyscale and to anyone who cannot separate the tones.
 */
const chip = cva(
  "inline-flex items-center gap-1.5 rounded-sm border px-2 py-0.5 text-[0.75rem] font-medium leading-5",
  {
    variants: {
      tone: {
        neutral: "border-line-strong bg-surface-sunken text-ink-soft",
        brass: "border-brass/30 bg-brass-wash text-brass-strong",
        brick: "border-brick/30 bg-brick-wash text-brick-strong",
        brand: "border-brand/25 bg-brand-wash text-brand-strong",
        positive: "border-positive/25 bg-positive-wash text-positive",
        caution: "border-caution/25 bg-caution-wash text-caution",
        critical: "border-critical/25 bg-critical-wash text-critical",
        info: "border-info/25 bg-info-wash text-info",
      },
    },
    defaultVariants: {
      tone: "neutral",
    },
  },
);

export type ChipProps = ComponentProps<"span"> & VariantProps<typeof chip>;

export function Chip({ className, tone, ...props }: ChipProps) {
  return <span className={cn(chip({ tone }), className)} {...props} />;
}
