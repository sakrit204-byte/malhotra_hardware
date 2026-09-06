"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { ArrowRight, Check, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/cn";
import { readBasketLines, type BasketLine } from "@/server/actions/inquiry-basket";

/**
 * What opens when something is added to the inquiry.
 *
 * A sheet slides in from the right with the whole inquiry list in it, the
 * line just added marked, and two ways out: keep browsing, or go and send it.
 * It replaces a button that said "Added" for two seconds and left the person
 * to work out where the thing had gone.
 *
 * It listens for the event the add button raises rather than being wired to
 * every button, so a new place to add from needs no new plumbing. The list is
 * read back from the server each time, resolved against the catalogue, so it
 * can never show a line the inquiry page would refuse.
 */
export function InquiryDrawer() {
  const [open, setOpen] = useState(false);
  const [lines, setLines] = useState<BasketLine[]>([]);
  const [count, setCount] = useState(0);
  const [latest, setLatest] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const closeRef = useRef<HTMLButtonElement>(null);
  const returnTo = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const onAdded = async (event: Event) => {
      const detail = (event as CustomEvent<{ productId: string; variantId: string | null }>).detail;
      returnTo.current = document.activeElement as HTMLElement | null;
      setLatest(`${detail.productId}:${detail.variantId ?? ""}`);
      setOpen(true);
      setLoading(true);

      try {
        const result = await readBasketLines();
        setLines(result.lines);
        setCount(result.count);
      } finally {
        setLoading(false);
      }
    };

    window.addEventListener("inquiry:added", onAdded);
    return () => window.removeEventListener("inquiry:added", onAdded);
  }, []);

  // Focus moves into the sheet when it opens and back to where it came from
  // when it closes, and Escape closes it, which is the least a dialog owes.
  useEffect(() => {
    if (!open) return;

    closeRef.current?.focus();

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };

    document.addEventListener("keydown", onKeyDown);
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = "";
      returnTo.current?.focus?.();
    };
  }, [open]);

  return (
    <>
      <div
        className={cn(
          "fixed inset-0 z-40 bg-ink/40 transition-opacity duration-[--duration-settled] ease-[--ease-quiet]",
          open ? "opacity-100" : "pointer-events-none opacity-0",
        )}
        aria-hidden="true"
        onClick={() => setOpen(false)}
      />

      <aside
        role="dialog"
        aria-modal="true"
        aria-labelledby="inquiry-drawer-title"
        inert={!open}
        className={cn(
          "fixed inset-y-0 right-0 z-50 flex w-full max-w-md flex-col bg-surface-raised shadow-overlay",
          "transition-transform duration-500 ease-[--ease-quiet]",
          open ? "translate-x-0" : "translate-x-full",
        )}
      >
        <div className="flex items-start justify-between gap-4 border-b border-ink px-6 pt-6 pb-5">
          <div>
            <p className="note flex items-center gap-2 text-positive">
              <Check className="size-3.5" aria-hidden="true" />
              Added to your inquiry
            </p>
            <h2 id="inquiry-drawer-title" className="mt-3 text-2xl text-ink">
              {count} {count === 1 ? "item" : "items"} so far
            </h2>
          </div>

          <button
            ref={closeRef}
            type="button"
            onClick={() => setOpen(false)}
            className="inline-flex size-10 shrink-0 items-center justify-center text-ink-soft transition-colors hover:bg-surface-sunken hover:text-ink"
          >
            <X className="size-5" aria-hidden="true" />
            <span className="sr-only">Close</span>
          </button>
        </div>

        <ul className="flex-1 divide-y divide-line overflow-y-auto px-6">
          {loading && lines.length === 0 ? (
            <li className="py-6 text-[0.9375rem] text-ink-muted">Fetching your list</li>
          ) : null}

          {lines.map((line, index) => {
            const isLatest = line.key === latest;

            return (
              <li
                key={line.key}
                className={cn(
                  "flex items-center gap-4 py-4 transition-colors duration-500",
                  isLatest && "bg-brand-wash/60 -mx-6 px-6",
                )}
                style={{ animationDelay: `${index * 40}ms` }}
              >
                <span className="relative size-16 shrink-0 overflow-hidden border border-line bg-surface-sunken">
                  {line.image ? (
                    <Image src={line.image} alt="" fill sizes="4rem" className="object-cover" />
                  ) : null}
                </span>

                <span className="min-w-0 flex-1">
                  <Link
                    href={line.href}
                    onClick={() => setOpen(false)}
                    className="block truncate text-[0.9375rem] text-ink underline decoration-transparent underline-offset-4 transition-colors hover:decoration-ink"
                  >
                    {line.name}
                  </Link>
                  <span className="note mt-1 block truncate">
                    {line.code}
                    {line.option ? `, ${line.option}` : ""}
                  </span>
                </span>

                <span className="figure shrink-0 text-ink-soft">
                  <span className="sr-only">Quantity </span>
                  {line.quantity}
                </span>
              </li>
            );
          })}
        </ul>

        <div className="space-y-3 border-t border-line px-6 py-5">
          <Button asChild size="lg" block>
            <Link href="/inquiry" onClick={() => setOpen(false)}>
              Review and send the inquiry
              <ArrowRight className="size-4" aria-hidden="true" />
            </Link>
          </Button>
          <Button size="lg" block variant="secondary" onClick={() => setOpen(false)}>
            Keep browsing
          </Button>
          <p className="note text-center">No account needed. We reply by email.</p>
        </div>
      </aside>
    </>
  );
}
