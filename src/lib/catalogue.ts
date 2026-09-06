/**
 * Presentation helpers shared by every catalogue surface.
 *
 * Labels live here rather than inside components so the words a customer reads
 * are identical on a card, on a product page, inside an inquiry and in an email.
 */

export type Availability =
  | "IN_STOCK"
  | "LIMITED"
  | "MADE_TO_ORDER"
  | "OUT_OF_STOCK"
  | "ON_REQUEST";

const availabilityLabels: Record<Availability, string> = {
  IN_STOCK: "In stock",
  LIMITED: "Limited stock",
  MADE_TO_ORDER: "Made to order",
  OUT_OF_STOCK: "Out of stock",
  ON_REQUEST: "Available on request",
};

const availabilityTones: Record<Availability, "positive" | "caution" | "critical" | "neutral"> = {
  IN_STOCK: "positive",
  LIMITED: "caution",
  MADE_TO_ORDER: "neutral",
  OUT_OF_STOCK: "critical",
  ON_REQUEST: "neutral",
};

export function availabilityLabel(value: string): string {
  return availabilityLabels[value as Availability] ?? "Available on request";
}

export function availabilityTone(value: string) {
  return availabilityTones[value as Availability] ?? "neutral";
}

/**
 * Resolves an image reference to a URL.
 *
 * Product images are stored as full paths. Editable site content stores the key
 * of a curated photograph instead, because an administrator picking a hero
 * image should not have to think about file paths.
 */
export function imageUrl(reference: string | null | undefined): string | null {
  if (!reference) return null;
  if (reference.startsWith("/") || reference.startsWith("http")) return reference;
  return `/uploads/catalogue/${reference}.jpg`;
}

/** Groups product specifications under their administrator defined headings. */
export function groupSpecifications<
  T extends { definition: { groupName: string | null; sortOrder: number } },
>(specifications: T[]): Array<{ group: string; items: T[] }> {
  const groups = new Map<string, T[]>();

  for (const specification of specifications) {
    const group = specification.definition.groupName ?? "Details";
    const existing = groups.get(group) ?? [];
    existing.push(specification);
    groups.set(group, existing);
  }

  return Array.from(groups.entries()).map(([group, items]) => ({
    group,
    items: items.sort((a, b) => a.definition.sortOrder - b.definition.sortOrder),
  }));
}

/** Formats a specification value with its unit, when the definition has one. */
export function specificationValue(value: string, unit: string | null): string {
  return unit ? `${value} ${unit}` : value;
}

export function productHref(slug: string): string {
  return `/products/${slug}`;
}
