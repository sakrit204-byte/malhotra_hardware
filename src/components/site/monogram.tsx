import { cn } from "@/lib/cn";

/**
 * The MH mark.
 *
 * Two uprights and a rail, drawn rather than lettered: the M and the H share
 * the same stroke and the same crossbar height, which is what makes them read
 * as one mark instead of two initials sitting together. The proportions come
 * from a butt hinge, three knuckles and a pin, because that is the piece this
 * business is built on and it survives being shrunk to a browser tab.
 *
 * It is a square, on the house colour, with no rounding anywhere, so it sits in
 * the same language as the rest of the site.
 */
export function Monogram({
  className,
  title = "Malhotra Hardware",
}: {
  className?: string;
  title?: string;
}) {
  return (
    <svg
      viewBox="0 0 40 40"
      role="img"
      aria-label={title}
      className={cn("size-9 shrink-0", className)}
    >
      <rect width="40" height="40" fill="var(--color-brand)" />

      {/* M: two uprights joined by a shallow vee that stops at the rail. */}
      <path
        d="M9 29V13l5.5 8 5.5-8v16"
        fill="none"
        stroke="var(--color-ink-onbrand)"
        strokeWidth="2.4"
        strokeLinecap="square"
        strokeLinejoin="miter"
      />

      {/* H: the same stroke, the crossbar set on the M's own optical centre. */}
      <path
        d="M25 13v16M33 13v16M25 21h8"
        fill="none"
        stroke="var(--color-ink-onbrand)"
        strokeWidth="2.4"
        strokeLinecap="square"
      />

      {/* The pin. A single brass point, the one warm mark on the whole mark. */}
      <rect x="19.8" y="32" width="1.6" height="1.6" fill="var(--color-brass)" />
    </svg>
  );
}
