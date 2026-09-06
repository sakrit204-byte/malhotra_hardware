import type { Metadata } from "next";
import Link from "next/link";
import { Plus, Search } from "lucide-react";

import { ProductTable } from "@/components/staff/product-table";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/states";
import { cn } from "@/lib/cn";
import { requireRole } from "@/server/auth/guards";
import {
  getEditorOptions,
  listProductsForAdmin,
  type ProductHealth,
  type ProductSort,
} from "@/server/repositories/admin";

export const metadata: Metadata = {
  title: "Products",
  robots: { index: false, follow: false },
};

const HEALTH: Array<{ value: ProductHealth; label: string }> = [
  { value: "unphotographed", label: "No photograph" },
  { value: "outOfStock", label: "Out of stock" },
  { value: "featured", label: "Featured" },
  { value: "popular", label: "Popular" },
];

const SORTS: Array<{ value: ProductSort; label: string }> = [
  { value: "recent", label: "Recently changed" },
  { value: "demand", label: "Most asked about" },
  { value: "name", label: "Name" },
  { value: "code", label: "Code" },
];

/**
 * The product list.
 *
 * Every filter the dashboard can send somebody to lives here, so a figure on
 * that screen is always one press away from the rows behind it. The table
 * itself is selectable, which is what turns this from a list into the place the
 * catalogue is run from.
 */
export default async function AdminProductsPage({
  searchParams,
}: PageProps<"/admin/products">) {
  await requireRole("ADMIN", "/admin/products");
  const params = await searchParams;

  const read = (key: string) =>
    typeof params[key] === "string" ? (params[key] as string) : undefined;

  const q = read("q");
  const published =
    params.published === "published" || params.published === "draft"
      ? params.published
      : undefined;
  const health = HEALTH.some((entry) => entry.value === read("health"))
    ? (read("health") as ProductHealth)
    : undefined;
  const sort = SORTS.some((entry) => entry.value === read("sort"))
    ? (read("sort") as ProductSort)
    : undefined;
  const category = read("category");
  const page = Number(read("page") ?? 1) || 1;

  const [result, options] = await Promise.all([
    listProductsForAdmin({ q, published, health, sort, category, page, idsOnly: true }),
    getEditorOptions(),
  ]);

  const parents = options.categories.filter((entry) => entry.parentId === null);

  /** Keeps every other filter while changing one of them. */
  const href = (changes: Record<string, string | undefined>) => {
    const next = new URLSearchParams();
    const current: Record<string, string | undefined> = {
      q,
      published,
      health,
      sort,
      category,
      ...changes,
    };

    for (const [key, value] of Object.entries(current)) {
      if (value) next.set(key, value);
    }

    const query = next.toString();
    return query ? `/admin/products?${query}` : "/admin/products";
  };

  const filtered = Boolean(q || published || health || category);

  return (
    <div className="px-5 py-8 sm:px-8 lg:px-10 lg:py-10">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="note">Catalogue</p>
          <h1 className="mt-3 text-[2.5rem] leading-[1.05]">
            {result.total} {result.total === 1 ? "product" : "products"}
          </h1>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <form action="/admin/products" role="search" className="flex gap-2">
            {published ? <input type="hidden" name="published" value={published} /> : null}
            {health ? <input type="hidden" name="health" value={health} /> : null}
            <div className="relative">
              <label htmlFor="admin-search" className="sr-only">
                Search products
              </label>
              <Search
                className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink-muted"
                aria-hidden="true"
              />
              <input
                id="admin-search"
                name="q"
                type="search"
                defaultValue={q ?? ""}
                placeholder="Name or code"
                className="h-10 w-56 border border-line-strong bg-surface-raised pl-9 pr-3 text-[0.9375rem]"
              />
            </div>
            <Button type="submit" variant="secondary">
              Search
            </Button>
          </form>

          <Button asChild>
            <Link href="/admin/products/new">
              <Plus className="size-4" aria-hidden="true" />
              New product
            </Link>
          </Button>
        </div>
      </header>

      {/* ---------------------------------------------------------- filters */}
      <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-3 border-y border-line py-3">
        <div className="flex flex-wrap items-center gap-1">
          <span className="note me-1">Show</span>
          {[
            { label: "All", value: undefined },
            { label: "Published", value: "published" },
            { label: "Drafts", value: "draft" },
          ].map((filter) => (
            <FilterChip
              key={filter.label}
              href={href({ published: filter.value, page: undefined })}
              active={published === filter.value}
            >
              {filter.label}
            </FilterChip>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-1">
          <span className="note me-1">Only</span>
          {HEALTH.map((entry) => (
            <FilterChip
              key={entry.value}
              href={href({
                health: health === entry.value ? undefined : entry.value,
                page: undefined,
              })}
              active={health === entry.value}
            >
              {entry.label}
            </FilterChip>
          ))}
        </div>

        <form action="/admin/products" className="flex items-center gap-2">
          {q ? <input type="hidden" name="q" value={q} /> : null}
          {published ? <input type="hidden" name="published" value={published} /> : null}
          {health ? <input type="hidden" name="health" value={health} /> : null}

          <label htmlFor="admin-category" className="note">
            Category
          </label>
          <select
            id="admin-category"
            name="category"
            defaultValue={category ?? ""}
            className="h-9 border border-line-strong bg-surface-raised px-2 text-[0.875rem]"
          >
            <option value="">Every category</option>
            {parents.map((entry) => (
              <option key={entry.id} value={entry.id}>
                {entry.name}
              </option>
            ))}
          </select>

          <label htmlFor="admin-sort" className="note">
            Order
          </label>
          <select
            id="admin-sort"
            name="sort"
            defaultValue={sort ?? "recent"}
            className="h-9 border border-line-strong bg-surface-raised px-2 text-[0.875rem]"
          >
            {SORTS.map((entry) => (
              <option key={entry.value} value={entry.value}>
                {entry.label}
              </option>
            ))}
          </select>

          <Button type="submit" size="sm" variant="secondary">
            Apply
          </Button>
        </form>

        {filtered ? (
          <Button asChild size="sm" variant="quiet">
            <Link href="/admin/products">Clear</Link>
          </Button>
        ) : null}
      </div>

      {/* ------------------------------------------------------------ table */}
      {result.items.length === 0 ? (
        <div className="mt-10">
          <EmptyState
            title="Nothing here"
            description="No product matches this view. Clear the filters, or add the first one."
            action={
              <Button asChild>
                <Link href="/admin/products/new">Add a product</Link>
              </Button>
            }
          />
        </div>
      ) : (
        <div className="mt-6">
          <ProductTable
            total={result.total}
            matchingIds={result.matchingIds ?? []}
            categories={parents.map((entry) => ({ id: entry.id, name: entry.name }))}
            rows={result.items.map((product) => ({
              id: product.id,
              name: product.name,
              code: product.code,
              isPublished: product.isPublished,
              isFeatured: product.isFeatured,
              isPopular: product.isPopular,
              availability: product.availability,
              category: product.category.name,
              image: product.images[0]?.url ?? null,
              variants: product._count.variants,
              inquiries: product._count.inquiryItems,
            }))}
          />
        </div>
      )}

      {result.pageCount > 1 ? (
        <nav
          aria-label="Product pages"
          className="mt-8 flex items-center justify-center gap-3"
        >
          {result.page > 1 ? (
            <Button asChild variant="secondary" size="sm">
              <Link href={href({ page: String(result.page - 1) })}>Previous</Link>
            </Button>
          ) : null}
          <span className="figure text-ink-muted">
            Page {result.page} of {result.pageCount}
          </span>
          {result.page < result.pageCount ? (
            <Button asChild variant="secondary" size="sm">
              <Link href={href({ page: String(result.page + 1) })}>Next</Link>
            </Button>
          ) : null}
        </nav>
      ) : null}
    </div>
  );
}

function FilterChip({
  href,
  active,
  children,
}: {
  href: string;
  active: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      aria-current={active ? "true" : undefined}
      className={cn(
        "px-2.5 py-1 text-[0.8125rem] transition-colors",
        active
          ? "bg-ink text-ink-inverse"
          : "text-ink-soft hover:bg-surface-sunken hover:text-ink",
      )}
    >
      {children}
    </Link>
  );
}
