import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import type { ComponentProps } from "react";

import { cn } from "@/lib/cn";

/**
 * The only button in the application. Links that look like buttons pass
 * `asChild` and wrap a Next.js Link so that navigation stays a real anchor and
 * keyboard and middle click behaviour is preserved.
 *
 * Corner rounding is deliberately small and no variant is a pill.
 */
const button = cva(
  [
    "inline-flex items-center justify-center gap-2 whitespace-nowrap",
    "font-medium transition-colors duration-[--duration-quick] ease-[--ease-quiet]",
    "disabled:pointer-events-none disabled:opacity-50",
    // A press is felt as well as seen, and a trailing arrow leans into the
    // hover. Both are tiny, and both are the difference between a control that
    // responds and one that merely recolours.
    "active:translate-y-px active:scale-[0.985] motion-reduce:active:transform-none",
    "[&_.lucide-arrow-right]:transition-transform [&_.lucide-arrow-right]:duration-[--duration-quick] hover:[&_.lucide-arrow-right]:translate-x-0.5",
    "aria-disabled:pointer-events-none aria-disabled:opacity-50",
  ],
  {
    variants: {
      variant: {
        primary: "bg-brand text-white hover:bg-brand-strong",
        secondary:
          "border border-line-strong bg-surface-raised text-ink hover:border-ink-muted hover:bg-surface-sunken",
        brass: "bg-brass text-white hover:bg-brass-strong",
        brand: "bg-brand text-white hover:bg-brand-strong",
        onPhoto:
          "border border-white/60 bg-white/10 text-white backdrop-blur-[2px] hover:bg-white/20",
        ghost: "text-ink hover:bg-surface-sunken",
        quiet: "text-ink-soft underline underline-offset-4 hover:text-ink",
        danger: "bg-critical text-white hover:brightness-110",
      },
      size: {
        sm: "h-8 rounded-sm px-3 text-[0.8125rem]",
        md: "h-10 rounded-md px-4 text-sm",
        lg: "h-12 rounded-md px-6 text-[0.9375rem]",
        icon: "size-9 rounded-md",
      },
      block: {
        true: "w-full",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "md",
    },
  },
);

export type ButtonProps = ComponentProps<"button"> &
  VariantProps<typeof button> & {
    /** Render the child element instead of a button, keeping the styling. */
    asChild?: boolean;
  };

export function Button({
  className,
  variant,
  size,
  block,
  asChild = false,
  type,
  ...props
}: ButtonProps) {
  const Component = asChild ? Slot : "button";

  return (
    <Component
      className={cn(button({ variant, size, block }), className)}
      {...(asChild ? {} : { type: type ?? "button" })}
      {...props}
    />
  );
}

export { button as buttonVariants };
