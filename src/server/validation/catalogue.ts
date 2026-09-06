import { z } from "zod";

import {
  SORT_OPTIONS,
  availabilityValues,
  type Availability,
  type CatalogueQuery,
  type SortOption,
} from "@/lib/catalogue";

/**
 * Catalogue query parsing.
 *
 * The browser sends filters as a query string, which is untrusted text. Every
 * value is parsed here before it reaches a repository, and anything unexpected
 * falls back to a safe default rather than throwing a page away.
 *
 * The options, the query type and the functions that build a query string live
 * in `@/lib/catalogue`, because the filter panel and the pagination need them
 * in the browser and must not carry a parser there to get them. This module is
 * server only. Importing it from a client component pulls the whole schema
 * library into the bundle.
 */

export {
  PRODUCTS_PER_PAGE,
  SORT_OPTIONS,
  availabilityValues,
  hasActiveFilters,
  pageHref,
  toggleFilterHref,
  type CatalogueQuery,
  type SortOption,
} from "@/lib/catalogue";

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
      if (!value) return [] as Availability[];
      const raw = Array.isArray(value) ? value : [value];
      return raw
        .flatMap((entry) => entry.split(","))
        .map((entry) => entry.trim().toUpperCase())
        .filter((entry): entry is Availability =>
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

/*
  The parser and the hand written type have to agree. If a field is added to
  the schema and not to CatalogueQuery, or the other way round, this fails to
  compile rather than drifting quietly.
*/
type ParsedQuery = z.infer<typeof catalogueQuerySchema>;
const _parserFitsType = (value: ParsedQuery): CatalogueQuery => value;
const _typeFitsParser = (value: CatalogueQuery): ParsedQuery => value;
void _parserFitsType;
void _typeFitsParser;

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
