import { z } from "zod";

/**
 * Catalogue query parsing.
 *
 * The browser sends filters as a query string, which is untrusted text. Every
 * value is parsed here before it reaches a repository, and anything unexpected
 * falls back to a safe default rather than throwing a page away.
 */

export const PRODUCTS_PER_PAGE = 24;

export const SORT_OPTIONS = [
  { value: "relevance", label: "Most relevant" },
  { value: "newest", label: "Recently added" },
  { value: "name", label: "Name A to Z" },
  { value: "popular", label: "Most viewed" },
] as const;

export type SortOption = (typeof SORT_OPTIONS)[number]["value"];

/** Splits a repeated query parameter into a clean list of slugs. */
const slugList = z
  .union([z.string(), z.array(z.string())])
  .optional()
  .transform((value) => {
    if (!value) return [] as string[];
    const raw = Array.isArray(value) ? value : [value];
    return Array.from(
      new Set(
        raw
          .flatMap((entry) => entry.split(","))
          .map((entry) => entry.trim().toLowerCase())
          .filter((entry) => /^[a-z0-9-]{1,64}$/.test(entry)),
      ),
    );
  });

export const availabilityValues = [
  "IN_STOCK",
  "LIMITED",
  "MADE_TO_ORDER",
  "OUT_OF_STOCK",
  "ON_REQUEST",
] as const;

export const catalogueQuerySchema = z.object({
  q: z
    .string()
    .trim()
    .max(120)
    .optional()
    .transform((value) => (value && value.length > 0 ? value : undefined)),
  category: slugList,
  subcategory: slugList,
  brand: slugList,
  material: slugList,
  finish: slugList,
  application: slugList,
  availability: z
    .union([z.string(), z.array(z.string())])
    .optional()
    .transform((value) => {
      if (!value) return [] as Array<(typeof availabilityValues)[number]>;
      const raw = Array.isArray(value) ? value : [value];
      return raw
        .flatMap((entry) => entry.split(","))
        .map((entry) => entry.trim().toUpperCase())
        .filter((entry): entry is (typeof availabilityValues)[number] =>
          (availabilityValues as readonly string[]).includes(entry),
        );
    }),
  sort: z
    .string()
    .optional()
    .transform((value): SortOption => {
      const allowed = SORT_OPTIONS.map((option) => option.value) as string[];
      return allowed.includes(value ?? "") ? (value as SortOption) : "relevance";
    }),
  page: z
    .union([z.string(), z.number()])
    .optional()
    .transform((value) => {
      const parsed = Number(value ?? 1);
      return Number.isFinite(parsed) && parsed >= 1 ? Math.floor(parsed) : 1;
    }),
});

export type CatalogueQuery = z.infer<typeof catalogueQuerySchema>;

/**
 * Next passes search params as a plain record. Parsing never throws: a broken
 * query string should show the default catalogue, not an error page.
 */
export function parseCatalogueQuery(
  input: Record<string, string | string[] | undefined>,
): CatalogueQuery {
  const result = catalogueQuerySchema.safeParse(input);

  if (result.success) return result.data;

  return catalogueQuerySchema.parse({});
}

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
