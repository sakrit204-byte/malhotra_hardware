import { ArrowRight } from "lucide-react";
import Link from "next/link";

import { HeroMedia } from "@/components/site/hero-media";
import type { HotspotProduct } from "@/components/site/hero-hotspots";
import { Button } from "@/components/ui/button";
import { Container } from "@/components/ui/container";
import type { HeroContent } from "@/server/repositories/content";

/**
 * Home page hero.
 *
 * The photograph runs the full width of the screen and the headline is set on
 * it, which is what gives the front of the site its weight. The type stays
 * legible without ruining the picture: the image is held down by a gradient
 * that is strong at the foot and gone by the middle, rather than a flat scrim
 * over the whole photograph.
 *
 * The strip at the head names the subject, the same title block every other
 * section carries. The figures beside it are counted from the database, so the
 * hero can never advertise a catalogue that is not there.
 */
export function Hero({
  content,
  image,
  detail,
  stats,
  hotspots,
}: {
  content: HeroContent;
  image: string | null;
  detail: {
    image: string;
    alt: string;
    name: string;
    code: string;
    finish: string | null;
    href: string;
  } | null;
  stats: Array<{ value: string; label: string }>;
  hotspots: HotspotProduct[];
}) {
  return (
    <section
      className="relative isolate overflow-hidden bg-surface-inverse"
      aria-labelledby="hero-heading"
    >
      {image ? (
        <HeroMedia
          image={image}
          alt="Modern brick house with dark framed windows and a planted garden"
          detail={detail}
          hotspots={hotspots}
          className="absolute inset-0"
        />
      ) : null}

      {/* The type sits above the photograph in its own layer, so the parallax
          underneath never drags it around.

          That layer is a full-bleed box with type in only part of it, and a
          transparent box still takes the pointer. Left as it was it covered the
          whole photograph and swallowed every hover meant for the points marked
          on the building, and every click meant for the detail card. So the layer
          itself is transparent to the pointer and each block of type takes it
          back, which leaves the empty space between them live to what is
          underneath while text stays selectable and the buttons stay clickable. */}
      <Container
        width="wide"
        className="on-inverse pointer-events-none relative z-20 flex min-h-[34rem] flex-col justify-end pb-14 pt-32 sm:min-h-[42rem] lg:min-h-[46rem] lg:pb-20"
      >
        <div
          className="rise pointer-events-auto flex items-center gap-4 border-t border-white/35 pt-3"
          style={{ animationDelay: "60ms" }}
        >
          <p className="note text-white">{content.eyebrow}</p>

          {stats.length > 0 ? (
            <p className="note ms-auto hidden text-white/70 sm:block">
              {stats.map((stat) => `${stat.value} ${stat.label}`).join("   ·   ")}
            </p>
          ) : null}
        </div>

        <h1
          id="hero-heading"
          className="rise pointer-events-auto mt-8 max-w-[14ch] text-balance font-display text-display text-white [text-shadow:0_1px_24px_rgb(0_0_0/0.35)]"
          style={{ animationDelay: "120ms" }}
        >
          {content.headline}
        </h1>

        <p
          className="rise pointer-events-auto mt-7 max-w-lg text-[1.0625rem] leading-relaxed text-white/85"
          style={{ animationDelay: "220ms" }}
        >
          {content.body}
        </p>

        <div
          className="rise pointer-events-auto mt-9 flex flex-wrap gap-3"
          style={{ animationDelay: "300ms" }}
        >
          <Button asChild size="lg" variant="brick">
            <Link href={content.primaryHref}>
              {content.primaryLabel}
              <ArrowRight
                className="size-4 transition-transform duration-[--duration-quick] ease-[--ease-quiet] group-hover:translate-x-0.5"
                aria-hidden="true"
              />
            </Link>
          </Button>
          <Button asChild size="lg" variant="onPhoto">
            <Link href={content.secondaryHref}>{content.secondaryLabel}</Link>
          </Button>
        </div>
      </Container>
    </section>
  );
}
