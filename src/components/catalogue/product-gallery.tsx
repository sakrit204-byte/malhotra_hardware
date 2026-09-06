"use client";

import Image from "next/image";
import { useRef, useState } from "react";

import { cn } from "@/lib/cn";

/**
 * Product image gallery.
 *
 * Every photograph is in the frame at once and the chosen one is faded to the
 * front, so switching between them is a crossfade rather than a blink. Moving
 * the pointer over the photograph magnifies it around the pointer, which is
 * how you look at a finish or a machined edge without a separate lightbox.
 * The magnifier is pointer only: it does nothing under touch, and nothing at
 * all under a reduced motion preference.
 *
 * The thumbnails are real buttons in a tab list, so the gallery is operable
 * with a keyboard and announces which image is showing. With a single image it
 * renders as a plain photograph with no controls at all.
 */
export function ProductGallery({
  images,
  productName,
}: {
  images: Array<{ id: string; url: string; alt: string; credit: string | null }>;
  productName: string;
}) {
  const [active, setActive] = useState(0);
  const [zoom, setZoom] = useState<{ x: number; y: number } | null>(null);
  const frameRef = useRef<HTMLDivElement>(null);

  if (images.length === 0) {
    return (
      <div className="flex aspect-square items-center justify-center border border-line bg-surface-sunken text-sm text-ink-muted">
        Photograph to follow
      </div>
    );
  }

  const index = Math.min(active, images.length - 1);
  const current = images[index];

  const track = (event: React.PointerEvent<HTMLDivElement>) => {
    if (event.pointerType !== "mouse") return;
    const frame = frameRef.current;
    if (!frame) return;

    const box = frame.getBoundingClientRect();
    setZoom({
      x: ((event.clientX - box.left) / box.width) * 100,
      y: ((event.clientY - box.top) / box.height) * 100,
    });
  };

  const step = (direction: -1 | 1) =>
    setActive((current) => (current + direction + images.length) % images.length);

  return (
    <div>
      <div
        ref={frameRef}
        onPointerMove={track}
        onPointerLeave={() => setZoom(null)}
        className={cn(
          "relative aspect-square overflow-hidden border border-line bg-surface-sunken",
          zoom && "cursor-zoom-in",
        )}
      >
        {images.map((image, position) => (
          <Image
            key={image.id}
            src={image.url}
            alt={position === index ? image.alt || productName : ""}
            aria-hidden={position === index ? undefined : true}
            fill
            priority={position === 0}
            sizes="(min-width: 1024px) 46rem, 100vw"
            className={cn(
              "object-cover transition-[opacity,transform] duration-500 ease-[--ease-quiet]",
              "motion-reduce:transition-none",
              position === index ? "opacity-100" : "opacity-0",
            )}
            style={
              position === index && zoom
                ? {
                    transformOrigin: `${zoom.x}% ${zoom.y}%`,
                    transform: "scale(2.2)",
                  }
                : undefined
            }
          />
        ))}

        {images.length > 1 ? (
          <p className="note absolute bottom-3 left-3 bg-surface-raised/90 px-2 py-1 text-ink-soft">
            {index + 1} / {images.length}
          </p>
        ) : null}
      </div>

      {images.length > 1 ? (
        <div
          role="tablist"
          aria-label={`Photographs of ${productName}`}
          className="mt-3 flex gap-3"
          onKeyDown={(event) => {
            if (event.key === "ArrowRight") step(1);
            if (event.key === "ArrowLeft") step(-1);
          }}
        >
          {images.map((image, position) => (
            <button
              key={image.id}
              type="button"
              role="tab"
              aria-selected={position === index}
              aria-label={`Photograph ${position + 1} of ${images.length}`}
              tabIndex={position === index ? 0 : -1}
              onClick={() => setActive(position)}
              onMouseEnter={() => setActive(position)}
              className={cn(
                "relative size-20 shrink-0 overflow-hidden border transition-[border-color,transform] duration-[--duration-quick] ease-[--ease-quiet]",
                position === index
                  ? "border-brand"
                  : "border-line hover:-translate-y-0.5 hover:border-line-strong",
              )}
            >
              <Image src={image.url} alt="" fill sizes="5rem" className="object-cover" />
            </button>
          ))}
        </div>
      ) : null}

      {current.credit ? (
        <p className="note mt-3">Photograph by {current.credit}</p>
      ) : null}
    </div>
  );
}
