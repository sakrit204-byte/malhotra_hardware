import type { Metadata } from "next";
import Link from "next/link";
import { Search } from "lucide-react";

import { FilterPanel, SortSelect } from "@/components/catalogue/filter-panel";
import { Pagination } from "@/components/catalogue/pagination";
import { ProductCard } from "@/components/catalogue/product-card";
import { Button } from "@/components/ui/button";
import { Container } from "@/components/ui/container";
import { EmptyState } from "@/components/ui/states";
import { getCatalogueFacets, listProducts } from "@/server/repositories/catalogue";
import {
  hasActiveFilters,
  parseCatalogueQuery,
} from "@/server/validation/catalogue";

export const metadata: Metadata = {
  title: "Products",
  description:
    "Browse the full range of architectural and home hardware stocked by Malhotra Enterprise in Kathmandu. Filter by category, finish, material, brand and availability.",
  alternates: { canonical: "/products" },
};

export default async function ProductsPage({ searchParams }: PageProps<"/products">) {
  const query = parseCatalogueQuery(await searchParams);

  const [result, facets] = await Promise.all([
    listProducts(query),
    getCatalogueFacets(query),
  ]);

  const filtered = hasActiveFilters(query);
  const heading = query.q ? `Results for ${query.q}` : "All products";

  return (
    <Container width="wide" className="sheet relative py-10 lg:py-14">
      <div className="relative pb-12">
        {/* The head of the sheet: where you are, what the sheet holds, and how
            many of them there are. All three are lettered, all three are true. */}
        <nav aria-label="Breadcrumb" className="note">
          <ol className="flex items-center gap-2 border-t border-ink pt-3">
            <li>
              <Link href="/" className="transition-colors hover:text-ink">
                Home
              </Link>
            </li>
            <li aria-hidden="true">/</li>
            <li className="text-ink-soft">Products</li>
            <li className="ms-auto tabular-nums">
              {result.total} {result.total === 1 ? "item" : "items"}
            </li>
          </ol>
        </nav>

        <h1 className="mt-8 max-w-[16ch] text-title text-ink">{heading}</h1>

        <form action="/products" role="search" className="mt-10 max-w-xl">
          <label htmlFor="catalogue-search" className="sr-only">
            Search products
          </label>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search
                className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-ink-muted"
                aria-hidden="true"
              />
              <input
                id="catalogue-search"
                name="q"
                type="search"
                defaultValue={query.q ?? ""}
                placeholder="Search by name, code or finish"
                className="h-12 w-full border border-line-strong bg-surface-raised pl-10 pr-3 hover:border-ink-muted"
              />
            </div>
            <Button type="submit" size="lg">
              Search
            </Button>
          </div>
        </form>
      </div>

      <div className="grid gap-10 border-t border-line pt-8 lg:grid-cols-[15rem_1fr] lg:gap-16">
        <aside className="lg:sticky lg:top-24 lg:self-start">
          <FilterPanel
            facets={facets}
            query={query}
            resultCount={result.total}
            hasFilters={filtered}
          />
        </aside>

        <div>
          <div className="flex flex-wrap items-center justify-between gap-3 pb-8">
            <p className="note" role="status" aria-live="polite">
              {result.total === 0
                ? "No products found"
                : `${result.total} ${result.total === 1 ? "product" : "products"}`}
              {result.approximate ? ", showing the closest matches" : ""}
            </p>

            <div className="hidden lg:block">
              <SortSelect current={query.sort} query={query} />
            </div>
          </div>

          {result.items.length === 0 ? (
            <EmptyState
              title={
                query.q
                  ? "Nothing matched that search"
                  : "No products match these filters"
              }
              description={
                query.q
                  ? "Try a shorter search, a product code, or browse by category instead. If you cannot find what you need, send us an inquiry and we will source it."
                  : "Try removing a filter, or send us an inquiry describing what the project needs."
              }
              action={
                <div className="flex flex-wrap justify-center gap-3">
                  <Button asChild variant="secondary">
                    <Link href="/products">Clear filters</Link>
                  </Button>
                  <Button asChild>
                    <Link href="/inquiry">Send an inquiry</Link>
                  </Button>
                </div>
              }
            />
          ) : (
            <>
              <ul className="stagger grid grid-cols-2 gap-x-5 gap-y-10 lg:grid-cols-3 xl:gap-x-6">
                {result.items.map((product, index) => (
                  <li key={product.id}>
                    <ProductCard
                      product={product}
                      priority={index < 4}
                    />
                  </li>
                ))}
              </ul>

              <Pagination
                query={query}
                page={result.page}
                pageCount={result.pageCount}
              />
            </>
          )}
        </div>
      </div>
    </Container>
  );
}
