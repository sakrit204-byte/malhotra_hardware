"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";

import { cn } from "@/lib/cn";

/**
 * Points marked on the hero photograph, each opening the product fitted there.
 *
 * The building is the argument: this is where the hardware actually goes. Each
 * point is a real button, so it works by hover, by keyboard and by touch:
 *
 * - hovering a point opens it, moving away closes it
 * - focusing a point opens it, so a keyboard reaches everything a mouse does
 * - tapping a point opens it and keeps it open, because a touch screen has no
 *   hover to leave
 * - Escape closes, and only one point is ever open
 *
 * The marker itself is deliberately quiet: a small translucent disc with a ring,
 * bright enough to find and faint enough to leave the photograph alone. Its one
 * animation is a slow breath that stops entirely under reduced motion, and it is
 * only there to say that the point can be touched.
 */

export type HotspotProduct = {
  x: number;
  y: number;
  label: string;
  name: string;
  code: string;
  finish: string | null;
  href: string;
  image: string | null;
  imageAlt: string;
};

export function HeroHotspots({
  hotspots,
}: {
  hotspots: HotspotProduct[];
}) {
  const [active, setActive] = useState<number | null>(null);
  const [pinned, setPinned] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (active === null) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setActive(null);
        setPinned(false);
      }
    };

    const onPointerDown = (event: PointerEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) {
        setActive(null);
        setPinned(false);
      }
    };

    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("pointerdown", onPointerDown);

    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("pointerdown", onPointerDown);
    };
  }, [active]);

  if (hotspots.length === 0) return null;

  return (
    // Above the type layer, not level with it. The points are placed against the
    // building, so some of them land under the headline or the buttons, and at an
    // equal depth the type wins on document order alone and the point below it
    // goes dead. Sitting above costs nothing, because this layer is transparent
    // to the pointer: only the discs themselves and an open card take it, which
    // is also what keeps an open card in front of the type rather than behind it.
    <div ref={containerRef} className="pointer-events-none absolute inset-0 z-30">
      {hotspots.map((hotspot, index) => {
        const open = active === index;
        // Cards near the right edge open to the left so they stay on screen.
        const toLeft = hotspot.x > 62;
        const above = hotspot.y > 62;

        return (
          <div
            key={`${hotspot.code}-${index}`}
            className="pointer-events-auto absolute -translate-x-1/2 -translate-y-1/2"
            style={{ left: `${hotspot.x}%`, top: `${hotspot.y}%` }}
            onMouseEnter={() => setActive(index)}
            onMouseLeave={() => {
              if (!pinned) setActive((current) => (current === index ? null : current));
            }}
          >
            <button
              type="button"
              aria-expanded={open}
              onFocus={() => setActive(index)}
              onBlur={() => {
                if (!pinned) setActive((current) => (current === index ? null : current));
              }}
              onClick={() => {
                if (open && pinned) {
                  setActive(null);
                  setPinned(false);
                } else {
                  setActive(index);
                  setPinned(true);
                }
              }}
              className="group relative flex size-7 items-center justify-center"
            >
              {/* The slow breath. Purely an invitation to touch the point, and
                  the first thing to go under a reduced motion preference. */}
              <span
                className={cn(
                  "absolute inset-0 rounded-full bg-white/25 motion-safe:animate-[breath_3.2s_ease-in-out_infinite]",
                  open && "motion-safe:animate-none",
                )}
                aria-hidden="true"
              />
              <span
                className={cn(
                  "relative size-3 rounded-full border border-white/70 bg-white/45 shadow-[0_1px_4px_rgba(0,0,0,0.35)] backdrop-blur-[1px]",
                  "transition-[transform,background-color] duration-[--duration-quick] ease-[--ease-quiet]",
                  "group-hover:scale-125 group-hover:bg-white/85",
                  open && "scale-125 bg-white",
                )}
                aria-hidden="true"
              />
              <span className="sr-only">
                {hotspot.label}, {hotspot.name}
              </span>
            </button>

            <div
              role="group"
              aria-label={hotspot.label}
              className={cn(
                "absolute z-10 w-60 origin-top",
                toLeft ? "right-3" : "left-3",
                // The offset is padding rather than distance, so the card is
                // drawn clear of the disc while its hit area still reaches
                // back to it. A real gap would close the card as soon as the
                // pointer left the disc to travel towards it.
                above ? "bottom-3 pb-4" : "top-3 pt-4",
                "transition-[opacity,transform] duration-[--duration-quick] ease-[--ease-quiet]",
                open
                  ? "pointer-events-auto translate-y-0 opacity-100"
                  : "pointer-events-none translate-y-1 opacity-0",
              )}
              // Hidden from assistive technology and from the tab order until
              // its point is open, so the hero is not a wall of links. React 19
              // takes inert as a boolean.
              aria-hidden={open ? undefined : true}
              inert={!open}
            >
              <Link
                href={hotspot.href}
                className="block overflow-hidden rounded-lg bg-surface-raised shadow-overlay ring-1 ring-black/10"
              >
                <div className="flex gap-3 p-3">
                  {hotspot.image ? (
                    <div className="relative size-14 shrink-0 overflow-hidden rounded-md bg-surface-sunken">
                      <Image
                        src={hotspot.image}
                        alt={hotspot.imageAlt}
                        fill
                        sizes="3.5rem"
                        className="object-cover"
                      />
                    </div>
                  ) : null}

                  <div className="min-w-0">
                    <p className="text-[0.625rem] uppercase tracking-[0.09em] text-brand">
                      {hotspot.label}
                    </p>
                    <p className="mt-1 text-[0.8125rem] font-medium leading-snug text-ink">
                      {hotspot.name}
                    </p>
                    <p className="mt-0.5 font-mono text-[0.6875rem] text-ink-muted">
                      {hotspot.code}
                      {hotspot.finish ? `, ${hotspot.finish}` : ""}
                    </p>
                  </div>
                </div>
              </Link>
            </div>
          </div>
        );
      })}
    </div>
  );
}
