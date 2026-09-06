"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef } from "react";

import { HeroHotspots, type HotspotProduct } from "@/components/site/hero-hotspots";
import { cn } from "@/lib/cn";

/**
 * The photographic half of the hero.
 *
 * Two photographs at two depths: the architecture behind, a piece of hardware
 * from the catalogue in front. They move at different rates as the page
 * scrolls, which is what actually reads as depth. A single image sliding on its
 * own reads as a slideshow, not as parallax.
 *
 * The rules that keep it honest:
 *
 * 1. Nothing moves when the reader has asked for reduced motion.
 * 2. Nothing moves while the hero is off screen.
 * 3. One scroll listener drives both layers inside one animation frame, so the
 *    two can never drift out of step with each other.
 * 4. The detail card is a real link to a real product. If the script never
 *    runs, the hero is two still photographs and a working link.
 */

type DetailProduct = {
  image: string;
  alt: string;
  name: string;
  code: string;
  finish: string | null;
  href: string;
};

export function HeroMedia({
  image,
  alt,
  detail,
  hotspots = [],
  className,
}: {
  image: string;
  alt: string;
  detail: DetailProduct | null;
  /** Points marked on the photograph, each opening a product. */
  hotspots?: HotspotProduct[];
  className?: string;
}) {
  const frameRef = useRef<HTMLDivElement>(null);
  const backRef = useRef<HTMLDivElement>(null);
  const frontRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const frame = frameRef.current;
    const back = backRef.current;

    if (!frame || !back) return;

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (reduceMotion.matches) return;

    let queued = false;
    let visible = false;

    const clear = () => {
      back.style.transform = "";
      if (frontRef.current) frontRef.current.style.transform = "";
    };

    const update = () => {
      queued = false;
      if (!visible) return;

      const rect = frame.getBoundingClientRect();

      // How far the hero has travelled through the viewport, from 1 when it
      // sits below the fold to negative once it has passed above it.
      const progress =
        (rect.top + rect.height / 2 - window.innerHeight / 2) / window.innerHeight;
      const clamped = Math.max(-1.5, Math.min(1.5, progress));

      // The far layer lags, the near layer leads. The gap between the two is
      // the whole effect.
      back.style.transform = `translate3d(0, ${(clamped * 56).toFixed(2)}px, 0) scale(1.06)`;

      if (frontRef.current) {
        frontRef.current.style.transform = `translate3d(0, ${(clamped * -34).toFixed(2)}px, 0)`;
      }
    };

    const onScroll = () => {
      if (queued) return;
      queued = true;
      requestAnimationFrame(update);
    };

    const observer = new IntersectionObserver(
      ([entry]) => {
        visible = entry.isIntersecting;
        if (visible) update();
      },
      { rootMargin: "15% 0px" },
    );

    const onPreferenceChange = () => {
      if (reduceMotion.matches) clear();
    };

    observer.observe(frame);
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    reduceMotion.addEventListener("change", onPreferenceChange);

    update();

    return () => {
      observer.disconnect();
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      reduceMotion.removeEventListener("change", onPreferenceChange);
    };
  }, []);

  return (
    <div ref={frameRef} className={cn("relative", className)}>
      {/* Far layer: the architecture. Overscaled so it has room to travel
          without ever showing an edge. */}
      <div className="absolute inset-0 overflow-hidden bg-surface-sunken">
        <div
          ref={backRef}
          className="absolute inset-[-8%] will-change-transform"
          style={{ transform: "scale(1.06)" }}
        >
          <Image
            src={image}
            alt={alt}
            fill
            priority
            sizes="(min-width: 1024px) 55vw, 100vw"
            className="object-cover"
          />
        </div>

        {/* Holds the foot of the photograph down so the headline set on it is
            legible. Strong at the bottom and gone by the middle, rather than a
            flat scrim, which would grey the whole picture out. */}
        <div
          className="absolute inset-0 bg-linear-to-t from-black/80 via-black/40 to-black/10"
          aria-hidden="true"
        />

        {/* A second wash from the left, so the type column has the contrast it
            needs without darkening the side of the photograph the building is
            actually on. */}
        <div
          className="absolute inset-0 bg-linear-to-r from-black/55 via-black/10 to-transparent"
          aria-hidden="true"
        />
      </div>

      {/* The points sit above the photograph but below the detail card, and
          outside the parallax layer so they stay exactly where they were
          placed on the building. */}
      <HeroHotspots hotspots={hotspots} />

      {/* Near layer: one piece of hardware from the catalogue, in front of the
          building it belongs in. On a wide screen it straddles the edge of the
          photograph deliberately, roughly a third of it over the page ground,
          which is what makes the two layers read as different distances.

          The outer element owns the position, the inner one owns the parallax
          transform. Keeping them apart means the scroll handler can write
          `transform` freely without destroying the layout offset. */}
      {detail ? (
        <div className="absolute bottom-6 right-6 z-10 hidden w-[13.5rem] sm:block sm:bottom-10 sm:right-10 sm:w-[15rem] lg:bottom-20 lg:right-[max(2rem,calc((100vw-96rem)/2+2rem))]">
          <div ref={frontRef} className="will-change-transform">
          <Link
            href={detail.href}
            className="group block bg-surface-raised shadow-overlay ring-1 ring-black/5"
          >
            <div className="relative aspect-4/5 overflow-hidden">
              <Image
                src={detail.image}
                alt={detail.alt}
                fill
                sizes="16rem"
                className="object-cover transition-transform duration-[--duration-settled] ease-[--ease-quiet] group-hover:scale-[1.04] motion-reduce:transition-none motion-reduce:group-hover:scale-100"
              />
            </div>
            <div className="border-t border-line px-4 py-3">
              <p className="text-[0.6875rem] uppercase tracking-[0.09em] text-brick-strong">
                From the catalogue
              </p>
              <p className="mt-1.5 text-[0.8125rem] font-medium leading-snug text-ink">
                {detail.name}
              </p>
              <p className="mt-0.5 font-mono text-[0.6875rem] text-ink-muted">
                {detail.code}
                {detail.finish ? `, ${detail.finish}` : ""}
              </p>
            </div>
          </Link>
          </div>
        </div>
      ) : null}
    </div>
  );
}
