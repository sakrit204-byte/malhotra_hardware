"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { prisma } from "@/server/db/prisma";
import {
  addItem,
  readBasket,
  removeItem,
  updateItem,
  writeBasket,
  MAX_ITEMS,
} from "@/server/inquiry/basket";
import { resolveBasket, toBasketItems } from "@/server/inquiry/resolve";

/**
 * Server actions for the inquiry workspace.
 *
 * Every action validates its input and checks that the product actually exists
 * and is published before it touches the basket, because the identifiers arrive
 * from the browser and cannot be trusted.
 */

export type BasketActionResult = {
  ok: boolean;
  message: string;
  count?: number;
};

const addSchema = z.object({
  productId: z.string().min(1).max(40),
  variantId: z
    .string()
    .max(40)
    .optional()
    .transform((value) => (value && value.length > 0 ? value : undefined)),
  quantity: z.coerce.number().int().min(1).max(9999).default(1),
  note: z
    .string()
    .max(500)
    .optional()
    .transform((value) => (value && value.trim().length > 0 ? value.trim() : undefined)),
});

export async function addToInquiry(
  _previous: BasketActionResult | null,
  formData: FormData,
): Promise<BasketActionResult> {
  const parsed = addSchema.safeParse({
    productId: formData.get("productId"),
    variantId: formData.get("variantId") ?? undefined,
    quantity: formData.get("quantity") ?? 1,
    note: formData.get("note") ?? undefined,
  });

  if (!parsed.success) {
    return { ok: false, message: "That product could not be added. Please try again." };
  }

  const product = await prisma.product.findFirst({
    where: { id: parsed.data.productId, isPublished: true, deletedAt: null },
    select: { id: true, name: true },
  });

  if (!product) {
    return { ok: false, message: "That product is no longer available." };
  }

  if (parsed.data.variantId) {
    const variant = await prisma.productVariant.findFirst({
      where: { id: parsed.data.variantId, productId: product.id, isActive: true },
      select: { id: true },
    });

    if (!variant) {
      return { ok: false, message: "That option is no longer available." };
    }
  }

  const basket = await readBasket();
  const alreadyPresent = basket.some(
    (item) =>
      item.productId === parsed.data.productId && item.variantId === parsed.data.variantId,
  );

  if (!alreadyPresent && basket.length >= MAX_ITEMS) {
    return {
      ok: false,
      message: `An inquiry can hold up to ${MAX_ITEMS} products. Send this one first, then start another.`,
      count: basket.length,
    };
  }

  const updated = addItem(basket, parsed.data);
  await writeBasket(updated);

  revalidatePath("/", "layout");

  return {
    ok: true,
    message: alreadyPresent
      ? `Quantity updated for ${product.name}.`
      : `${product.name} added to your inquiry.`,
    count: updated.length,
  };
}

const lineSchema = z.object({
  productId: z.string().min(1).max(40),
  variantId: z
    .string()
    .max(40)
    .optional()
    .transform((value) => (value && value.length > 0 ? value : undefined)),
});

export async function removeFromInquiry(formData: FormData): Promise<void> {
  const parsed = lineSchema.safeParse({
    productId: formData.get("productId"),
    variantId: formData.get("variantId") ?? undefined,
  });

  if (!parsed.success) return;

  const basket = await readBasket();
  await writeBasket(removeItem(basket, parsed.data.productId, parsed.data.variantId));

  revalidatePath("/inquiry");
  revalidatePath("/", "layout");
}

const updateSchema = lineSchema.extend({
  quantity: z.coerce.number().int().min(1).max(9999).optional(),
  note: z.string().max(500).optional(),
});

/**
 * Rewrites the basket cookie to match what could actually be resolved.
 *
 * A page may not modify a cookie while it renders, so the workspace shows the
 * resolved basket and asks for this once when something has gone stale. Without
 * JavaScript nothing calls it, and the cookie is tidied by the next add,
 * change, removal or submission instead. Either way the customer only ever sees
 * products that still exist.
 */
export async function pruneInquiryBasket(): Promise<void> {
  const basket = await readBasket();

  if (basket.length === 0) return;

  const resolved = await resolveBasket(basket);

  if (!resolved.changed) return;

  await writeBasket(toBasketItems(resolved.lines));

  revalidatePath("/inquiry");
  revalidatePath("/", "layout");
}

/**
 * Switches a line to a different option, keeping its quantity and note.
 *
 * A change of option is a change of identity for the line, so the old one is
 * removed and a new one added rather than the identifier being edited in place.
 * That keeps the merge rules in one function and avoids ending up with two
 * lines for the same option.
 */
export async function changeInquiryVariant(formData: FormData): Promise<void> {
  const parsed = z
    .object({
      productId: z.string().min(1).max(40),
      currentVariantId: z
        .string()
        .max(40)
        .optional()
        .transform((value) => (value && value.length > 0 ? value : undefined)),
      // An empty value means the customer has gone back to no particular
      // option, which is a legitimate choice and not a validation failure.
      variantId: z
        .string()
        .max(40)
        .transform((value) => (value.length > 0 ? value : undefined)),
    })
    .safeParse({
      productId: formData.get("productId"),
      currentVariantId: formData.get("currentVariantId") ?? undefined,
      variantId: formData.get("variantId"),
    });

  if (!parsed.success) return;

  if (parsed.data.variantId) {
    const variant = await prisma.productVariant.findFirst({
      where: {
        id: parsed.data.variantId,
        productId: parsed.data.productId,
        isActive: true,
        product: { isPublished: true, deletedAt: null },
      },
      select: { id: true },
    });

    if (!variant) return;
  }

  const basket = await readBasket();
  const existing = basket.find(
    (item) =>
      item.productId === parsed.data.productId &&
      item.variantId === parsed.data.currentVariantId,
  );

  if (!existing) return;

  const withoutOld = removeItem(
    basket,
    parsed.data.productId,
    parsed.data.currentVariantId,
  );

  await writeBasket(
    addItem(withoutOld, {
      productId: parsed.data.productId,
      ...(parsed.data.variantId ? { variantId: parsed.data.variantId } : {}),
      quantity: existing.quantity,
      note: existing.note,
    }),
  );

  revalidatePath("/inquiry");
  revalidatePath("/", "layout");
}

export async function updateInquiryLine(formData: FormData): Promise<void> {
  const parsed = updateSchema.safeParse({
    productId: formData.get("productId"),
    variantId: formData.get("variantId") ?? undefined,
    quantity: formData.get("quantity") ?? undefined,
    note: formData.get("note") ?? undefined,
  });

  if (!parsed.success) return;

  const basket = await readBasket();

  await writeBasket(
    updateItem(basket, parsed.data.productId, parsed.data.variantId, {
      quantity: parsed.data.quantity,
      note: parsed.data.note,
    }),
  );

  revalidatePath("/inquiry");
  revalidatePath("/", "layout");
}

export type BasketLine = {
  key: string;
  productId: string;
  name: string;
  code: string;
  option: string | null;
  quantity: number;
  image: string | null;
  href: string;
};

/**
 * The basket as a short list, for the drawer that opens when something is
 * added. Resolved against the catalogue exactly as the inquiry page resolves
 * it, so the drawer can never show a line the inquiry page would drop.
 */
export async function readBasketLines(): Promise<{ lines: BasketLine[]; count: number }> {
  const resolved = await resolveBasket(await readBasket());

  return {
    count: resolved.itemCount,
    lines: resolved.lines.map((line) => ({
      key: line.productId + ":" + (line.variantId ?? ""),
      productId: line.productId,
      name: line.product.name,
      code: line.variant?.code ?? line.product.code,
      option: line.variant?.name ?? null,
      quantity: line.quantity,
      image: line.product.imageUrl,
      href: "/products/" + line.product.slug,
    })),
  };
}
