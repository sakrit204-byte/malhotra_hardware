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

/* --------------------------------------------------------------------------
   The shape of a catalogue query, and the pure functions that read it.

   These live here rather than beside the parser on purpose. The filter panel
   and the pagination are client components, and importing anything from the
   validation module pulled the whole schema library into the browser bundle
   with it. Nothing below needs a parser: it is a list of options, a type, and
   three functions that build a query string.
   -------------------------------------------------------------------------- */

export const PRODUCTS_PER_PAGE = 24;

export const SORT_OPTIONS = [
  { value: "relevance", label: "Most relevant" },
  { value: "newest", label: "Recently added" },
  { value: "name", label: "Name A to Z" },
  { value: "popular", label: "Most viewed" },
] as const;

export type SortOption = (typeof SORT_OPTIONS)[number]["value"];

export const availabilityValues = [
  "IN_STOCK",
  "LIMITED",
  "MADE_TO_ORDER",
  "OUT_OF_STOCK",
  "ON_REQUEST",
] as const;

/**
 * A parsed catalogue query. Written out rather than inferred from the schema,
 * so that reading it costs the browser nothing. The parser declares that its
 * own output matches this, so the two cannot drift apart unnoticed.
 */
export type CatalogueQuery = {
  q: string | undefined;
  category: string[];
  subcategory: string[];
  brand: string[];
  material: string[];
  finish: string[];
  application: string[];
  availability: Availability[];
  sort: SortOption;
  page: number;
};

/** True when anything narrows the catalogue, used to offer a clear action. */
export function hasActiveFilters(query: CatalogueQuery): boolean {
  return (
    query.category.length > 0 ||
    query.subcategory.length > 0 ||
    query.brand.length > 0 ||
    query.material.length > 0 ||
    query.finish.length > 0 ||
    query.application.length > 0 ||
    query.availability.length > 0 ||
    Boolean(query.q)
  );
}

/** Rebuilds a query string with one filter value toggled on or off. */
export function toggleFilterHref(
  query: CatalogueQuery,
  key: "category" | "subcategory" | "brand" | "material" | "finish" | "application",
  value: string,
): string {
  const params = new URLSearchParams();

  const dimensions = {
    category: query.category,
    subcategory: query.subcategory,
    brand: query.brand,
    material: query.material,
    finish: query.finish,
    application: query.application,
  };

  for (const [name, values] of Object.entries(dimensions)) {
    const next =
      name === key
        ? values.includes(value)
          ? values.filter((entry) => entry !== value)
          : [...values, value]
        : values;

    for (const entry of next) params.append(name, entry);
  }

  for (const entry of query.availability) params.append("availability", entry);
  if (query.q) params.set("q", query.q);
  if (query.sort !== "relevance") params.set("sort", query.sort);

  const search = params.toString();
  return search ? `/products?${search}` : "/products";
}

/** Rebuilds a query string pointing at a different page of the same result. */
export function pageHref(query: CatalogueQuery, page: number): string {
  const params = new URLSearchParams();

  for (const value of query.category) params.append("category", value);
  for (const value of query.subcategory) params.append("subcategory", value);
  for (const value of query.brand) params.append("brand", value);
  for (const value of query.material) params.append("material", value);
  for (const value of query.finish) params.append("finish", value);
  for (const value of query.application) params.append("application", value);
  for (const value of query.availability) params.append("availability", value);
  if (query.q) params.set("q", query.q);
  if (query.sort !== "relevance") params.set("sort", query.sort);
  if (page > 1) params.set("page", String(page));

  const search = params.toString();
  return search ? `/products?${search}` : "/products";
}
