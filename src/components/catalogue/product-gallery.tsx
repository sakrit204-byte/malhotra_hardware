"use client";

import Image from "next/image";
import { useState } from "react";

import { cn } from "@/lib/cn";

/**
 * Product image gallery.
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

  if (images.length === 0) {
    return (
      <div className="flex aspect-square items-center justify-center border border-line bg-surface-sunken text-sm text-ink-muted">
        Photograph to follow
      </div>
    );
  }

  const current = images[Math.min(active, images.length - 1)];

  return (
    <div>
      <div className="relative aspect-square overflow-hidden border border-line bg-surface-sunken">
        <Image
          src={current.url}
          alt={current.alt || productName}
          fill
          priority
          sizes="(min-width: 1024px) 46rem, 100vw"
          className="object-cover"
        />
      </div>

      {images.length > 1 ? (
        <div
          role="tablist"
          aria-label={`Photographs of ${productName}`}
          className="mt-3 flex gap-3"
        >
          {images.map((image, index) => (
            <button
              key={image.id}
              type="button"
              role="tab"
              aria-selected={index === active}
              aria-label={`Photograph ${index + 1} of ${images.length}`}
              onClick={() => setActive(index)}
              className={cn(
                "relative size-20 shrink-0 overflow-hidden border bg-surface-sunken transition-colors",
                index === active
                  ? "border-ink"
                  : "border-line hover:border-line-strong",
              )}
            >
              <Image
                src={image.url}
                alt=""
                fill
                sizes="5rem"
                className="object-cover"
              />
            </button>
          ))}
        </div>
      ) : null}

      {current.credit ? (
        <p className="mt-3 text-[0.75rem] text-ink-muted">
          Photograph by {current.credit}
        </p>
      ) : null}
    </div>
  );
}
