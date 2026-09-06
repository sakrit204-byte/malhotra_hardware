import "server-only";

import { prisma } from "@/server/db/prisma";
import type { BasketItem } from "@/server/inquiry/basket";

/**
 * Turns the identifiers held in the basket cookie into real products.
 *
 * The cookie holds identifiers and quantities and nothing else. Names, codes,
 * finishes, images and availability are read from the database on every render,
 * so a basket kept for a month cannot show a product that has since been
 * renamed, withdrawn or unpublished.
 *
 * Everything that can go stale is handled here rather than at the call site:
 *
 * - a product that has been unpublished or deleted is dropped, and the customer
 *   is told which one and why
 * - a variant that has been deactivated is cleared, the product is kept, and
 *   the customer is asked to choose again rather than having their line
 *   silently changed to a different option
 * - a quantity outside the allowed range is clamped
 * - duplicate lines for the same product and variant are merged
 *
 * When anything changed, `changed` is true and the caller rewrites the cookie
 * so the customer is not told the same thing again on the next page.
 */

export type ResolvedLine = {
  productId: string;
  variantId: string | null;
  quantity: number;
  note: string | null;
  product: {
    id: string;
    name: string;
    slug: string;
    code: string;
    availability: string;
    categoryName: string;
    imageUrl: string | null;
    imageAlt: string;
    finishName: string | null;
  };
  variant: {
    id: string;
    name: string;
    code: string;
    availability: string;
    finishName: string | null;
  } | null;
  /** Options the customer can switch to without leaving the workspace. */
  variantOptions: Array<{ id: string; name: string; availability: string }>;
  /** Set when the chosen option disappeared and a new one has to be picked. */
  needsVariantChoice: boolean;
};

export type DroppedLine = {
  reason: "productUnavailable";
  productName: string | null;
};

export type ResolvedBasket = {
  lines: ResolvedLine[];
  dropped: DroppedLine[];
  /** True when the stored cookie no longer matches what we could resolve. */
  changed: boolean;
  itemCount: number;
  totalQuantity: number;
};

const MIN_QUANTITY = 1;
const MAX_QUANTITY = 9999;

export async function resolveBasket(items: BasketItem[]): Promise<ResolvedBasket> {
  if (items.length === 0) {
    return { lines: [], dropped: [], changed: false, itemCount: 0, totalQuantity: 0 };
  }

  // Merge duplicates before touching the database. A cookie written by an older
  // version of the site, or edited by hand, can contain the same line twice.
  const merged = new Map<string, BasketItem>();
  let changed = false;

  for (const item of items) {
    const key = `${item.productId}:${item.variantId ?? ""}`;
    const existing = merged.get(key);

    const quantity = Math.min(
      MAX_QUANTITY,
      Math.max(MIN_QUANTITY, Math.floor(item.quantity)),
    );

    if (quantity !== item.quantity) changed = true;

    if (existing) {
      changed = true;
      existing.quantity = Math.min(MAX_QUANTITY, existing.quantity + quantity);
      existing.note = existing.note ?? item.note;
    } else {
      merged.set(key, { ...item, quantity });
    }
  }

  const wanted = Array.from(merged.values());
  const productIds = Array.from(new Set(wanted.map((item) => item.productId)));

  const products = await prisma.product.findMany({
    where: { id: { in: productIds }, isPublished: true, deletedAt: null },
    select: {
      id: true,
      name: true,
      slug: true,
      code: true,
      availability: true,
      category: { select: { name: true } },
      finish: { select: { name: true } },
      images: {
        select: { url: true, alt: true },
        orderBy: [{ isPrimary: "desc" }, { sortOrder: "asc" }],
        take: 1,
      },
      variants: {
        where: { isActive: true },
        orderBy: { sortOrder: "asc" },
        select: {
          id: true,
          name: true,
          code: true,
          availability: true,
          finish: { select: { name: true } },
        },
      },
    },
  });

  const productsById = new Map(products.map((product) => [product.id, product]));

  const lines: ResolvedLine[] = [];
  const dropped: DroppedLine[] = [];

  for (const item of wanted) {
    const product = productsById.get(item.productId);

    // The product was unpublished, soft deleted or removed outright.
    if (!product) {
      changed = true;
      dropped.push({ reason: "productUnavailable", productName: null });
      continue;
    }

    const variant = item.variantId
      ? (product.variants.find((candidate) => candidate.id === item.variantId) ?? null)
      : null;

    // The chosen option is gone. Keep the product, because the customer clearly
    // wants it, but make them choose again rather than guessing on their behalf.
    const needsVariantChoice = Boolean(item.variantId) && variant === null;
    if (needsVariantChoice) changed = true;

    lines.push({
      productId: product.id,
      variantId: variant?.id ?? null,
      quantity: item.quantity,
      note: item.note ?? null,
      product: {
        id: product.id,
        name: product.name,
        slug: product.slug,
        code: product.code,
        availability: product.availability,
        categoryName: product.category.name,
        imageUrl: product.images[0]?.url ?? null,
        imageAlt: product.images[0]?.alt ?? product.name,
        finishName: product.finish?.name ?? null,
      },
      variant: variant
        ? {
            id: variant.id,
            name: variant.name,
            code: variant.code,
            availability: variant.availability,
            finishName: variant.finish?.name ?? null,
          }
        : null,
      variantOptions: product.variants.map((option) => ({
        id: option.id,
        name: option.name,
        availability: option.availability,
      })),
      needsVariantChoice,
    });
  }

  return {
    lines,
    dropped,
    changed,
    itemCount: lines.length,
    totalQuantity: lines.reduce((total, line) => total + line.quantity, 0),
  };
}

/** The cookie shape that matches a resolved basket, for writing back. */
export function toBasketItems(lines: ResolvedLine[]): BasketItem[] {
  return lines.map((line) => ({
    productId: line.productId,
    ...(line.variantId ? { variantId: line.variantId } : {}),
    quantity: line.quantity,
    ...(line.note ? { note: line.note } : {}),
  }));
}
