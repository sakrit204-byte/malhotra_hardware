import "server-only";

import { createHmac, timingSafeEqual } from "node:crypto";

import { cookies } from "next/headers";
import { z } from "zod";

import { env } from "@/server/env";

/**
 * The inquiry workspace, stored in a signed cookie.
 *
 * A customer must be able to gather products and send an inquiry without an
 * account, so the basket lives in a cookie rather than behind a login. The
 * cookie is signed so that a customer cannot hand themselves a basket that
 * refers to products they should not see, and the contents are re read from the
 * database on every render, so a stale cookie can never show a stale price,
 * name or availability.
 */

export const BASKET_COOKIE = "me_inquiry";
const MAX_ITEMS = 60;
const MAX_QUANTITY = 9999;
const MAX_AGE_SECONDS = 60 * 60 * 24 * 30;

const basketItemSchema = z.object({
  productId: z.string().min(1).max(40),
  variantId: z.string().min(1).max(40).optional(),
  quantity: z.number().int().min(1).max(MAX_QUANTITY),
  note: z.string().max(500).optional(),
});

const basketSchema = z.array(basketItemSchema).max(MAX_ITEMS);

export type BasketItem = z.infer<typeof basketItemSchema>;

function sign(payload: string): string {
  return createHmac("sha256", env.SESSION_SECRET).update(payload).digest("base64url");
}

function verify(payload: string, signature: string): boolean {
  const expected = Buffer.from(sign(payload));
  const actual = Buffer.from(signature);

  if (expected.length !== actual.length) return false;

  return timingSafeEqual(expected, actual);
}

function encode(items: BasketItem[]): string {
  const payload = Buffer.from(JSON.stringify(items), "utf8").toString("base64url");
  return `${payload}.${sign(payload)}`;
}

function decode(value: string | undefined): BasketItem[] {
  if (!value) return [];

  const separator = value.lastIndexOf(".");
  if (separator < 1) return [];

  const payload = value.slice(0, separator);
  const signature = value.slice(separator + 1);

  if (!verify(payload, signature)) return [];

  try {
    const parsed = basketSchema.safeParse(
      JSON.parse(Buffer.from(payload, "base64url").toString("utf8")),
    );
    return parsed.success ? parsed.data : [];
  } catch {
    return [];
  }
}

/** Reads the basket. Never throws, because a bad cookie is not an error page. */
export async function readBasket(): Promise<BasketItem[]> {
  const store = await cookies();
  return decode(store.get(BASKET_COOKIE)?.value);
}

export async function writeBasket(items: BasketItem[]): Promise<void> {
  const store = await cookies();
  const trimmed = items.slice(0, MAX_ITEMS);

  if (trimmed.length === 0) {
    store.delete(BASKET_COOKIE);
    return;
  }

  store.set(BASKET_COOKIE, encode(trimmed), {
    httpOnly: true,
    sameSite: "lax",
    secure: env.NODE_ENV === "production",
    path: "/",
    maxAge: MAX_AGE_SECONDS,
  });
}

export async function clearBasket(): Promise<void> {
  const store = await cookies();
  store.delete(BASKET_COOKIE);
}

/** Number of distinct lines, which is what the header badge shows. */
export async function countBasketItems(): Promise<number> {
  return (await readBasket()).length;
}

/**
 * Adds a line, or increases the quantity when the same product and variant is
 * already in the basket. Returns the resulting basket.
 */
export function addItem(items: BasketItem[], next: BasketItem): BasketItem[] {
  const index = items.findIndex(
    (item) => item.productId === next.productId && item.variantId === next.variantId,
  );

  if (index === -1) {
    return [...items, next];
  }

  const updated = [...items];
  const existing = updated[index];

  updated[index] = {
    ...existing,
    quantity: Math.min(existing.quantity + next.quantity, MAX_QUANTITY),
    note: next.note ?? existing.note,
  };

  return updated;
}

export function removeItem(
  items: BasketItem[],
  productId: string,
  variantId?: string,
): BasketItem[] {
  return items.filter(
    (item) => !(item.productId === productId && item.variantId === variantId),
  );
}

export function updateItem(
  items: BasketItem[],
  productId: string,
  variantId: string | undefined,
  changes: { quantity?: number; note?: string },
): BasketItem[] {
  return items.map((item) => {
    if (item.productId !== productId || item.variantId !== variantId) return item;

    return {
      ...item,
      quantity: changes.quantity
        ? Math.min(Math.max(1, Math.floor(changes.quantity)), MAX_QUANTITY)
        : item.quantity,
      note: changes.note === undefined ? item.note : changes.note || undefined,
    };
  });
}

export { MAX_ITEMS, MAX_QUANTITY };
