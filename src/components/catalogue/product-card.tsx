import Image from "next/image";
import Link from "next/link";

import { AddToInquiry } from "@/components/catalogue/add-to-inquiry";
import { Plate } from "@/components/ui/drawing";
import { availabilityLabel, productHref } from "@/lib/catalogue";
import { cn } from "@/lib/cn";
import type { ProductCard as ProductCardData } from "@/server/repositories/catalogue";

/**
 * A catalogue card, drawn as a plate on a sheet.
 *
 * The photograph is registered with corner marks rather than boxed in, the
 * product code is lettered above it the way a detail is numbered, and the name
 * and finish sit under a hairline. Everything a
 * card used to carry beyond that, the category, the brand and a paragraph of
 * description, is on the product page where there is room for it.
 *
 * The whole card is one link with one focus stop. The add button sits above it
 * and stays independently reachable.
 */
export function ProductCard({
  product,
  priority = false,
  className,
}: {
  product: ProductCardData;
  priority?: boolean;
  className?: string;
}) {
  const [primary, secondary] = product.images;
  const finish = product.finish?.name ?? product.material?.name ?? null;

  return (
    <article className={cn("group relative flex flex-col", className)}>
      {/* The code is lettered above the plate, where a drawing numbers a
          detail. It is also the thing a customer reads out on the telephone,
          so it earns its place at the top of the card. */}
      <p className="note mb-3 flex items-center justify-between gap-3 border-t border-line pt-2.5 transition-colors duration-[--duration-settled] group-hover:border-brick">
        <span className="truncate">{product.code}</span>
        {product.availability !== "IN_STOCK" ? (
          <span className="shrink-0 text-brick">
            {availabilityLabel(product.availability)}
          </span>
        ) : null}
      </p>

      <Plate className="plate-hover aspect-4/5">
        {primary ? (
          <Image
            src={primary.url}
            alt={primary.alt}
            fill
            sizes="(min-width: 1280px) 24rem, (min-width: 768px) 33vw, 50vw"
            priority={priority}
            className={cn(
              "object-cover transition-[opacity,transform] duration-500 ease-[--ease-quiet]",
              "group-hover:scale-[1.04]",
              secondary && "group-hover:opacity-0",
              "motion-reduce:transition-none motion-reduce:group-hover:scale-100",
            )}
          />
        ) : (
          <div className="note flex h-full items-center justify-center">
            Photograph to follow
          </div>
        )}

        {secondary ? (
          <Image
            src={secondary.url}
            alt=""
            aria-hidden="true"
            fill
            sizes="(min-width: 1280px) 24rem, (min-width: 768px) 33vw, 50vw"
            className="scale-[1.04] object-cover opacity-0 transition-opacity duration-500 ease-[--ease-quiet] group-hover:opacity-100 motion-reduce:transition-none"
          />
        ) : null}

        {/* The add control sits on the photograph. On a pointer device it
            fades in with the card, because a grid of permanent buttons is
            noise. On anything without hover it is simply always there, because
            an action nobody can reveal is an action nobody can use. */}
        <div
          className={cn(
            "absolute bottom-3 right-3 z-10 transition-[opacity,transform] duration-[--duration-quick] ease-[--ease-quiet]",
            "[@media(hover:hover)]:translate-y-1 [@media(hover:hover)]:opacity-0",
            "group-hover:translate-y-0 group-hover:opacity-100 group-focus-within:translate-y-0 group-focus-within:opacity-100",
          )}
        >
          <AddToInquiry productId={product.id} label="Add" variant="primary" compact />
        </div>
      </Plate>

      <div className="mt-4">
        <h3 className="text-[1.0625rem] leading-snug text-ink">
          <Link
            href={productHref(product.slug)}
            className="underline decoration-transparent underline-offset-[6px] transition-[color,text-decoration-color] duration-[--duration-settled] ease-[--ease-quiet] after:absolute after:inset-0 group-hover:text-brick group-hover:decoration-brick"
          >
            {product.name}
          </Link>
        </h3>

        {finish ? (
          <div className="mt-2.5 flex items-baseline justify-between gap-3 border-t border-line pt-2.5">
            <span className="flex min-w-0 items-center gap-2 text-[0.8125rem] text-ink-muted">
              {product.finish?.swatchHex ? (
                <span
                  className="size-2 shrink-0 border border-line-strong"
                  style={{ backgroundColor: product.finish.swatchHex }}
                  aria-hidden="true"
                />
              ) : null}
              <span className="truncate">{finish}</span>
            </span>
          </div>
        ) : null}
      </div>
    </article>
  );
}
