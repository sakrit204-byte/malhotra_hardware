"use client";

import { ChevronDown, SlidersHorizontal, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { availabilityLabel } from "@/lib/catalogue";
import { cn } from "@/lib/cn";
import type { CatalogueFacets } from "@/server/repositories/catalogue";
import { SORT_OPTIONS, type CatalogueQuery } from "@/server/validation/catalogue";

/**
 * Catalogue filters.
 *
 * This is an ordinary GET form. Without JavaScript a customer ticks boxes and
 * presses the apply button; with JavaScript the form submits itself as soon as
 * a box changes. Either way the result is a plain URL that can be shared,
 * bookmarked and reached with the back button.
 */

type FilterGroupProps = {
  legend: string;
  name: string;
  options: Array<{ slug: string; name: string; count: number; swatchHex?: string | null }>;
  selected: string[];
  /** Open on arrival. Everything else folds away until it is wanted. */
  defaultOpen?: boolean;
};

/**
 * One filter dimension, folded away by default.
 *
 * Six groups laid out flat made a column so long that the products beside it
 * stopped being the point. Folded, the whole set fits in a glance and opens
 * only where somebody is actually looking. A group holding a live filter opens
 * itself, so a filter can never be applied and hidden at the same time.
 */
function FilterGroup({
  legend,
  name,
  options,
  selected,
  defaultOpen = false,
}: FilterGroupProps) {
  const available = options.filter(
    (option) => option.count > 0 || selected.includes(option.slug),
  );

  const [open, setOpen] = useState(defaultOpen || selected.length > 0);
  const [showAll, setShowAll] = useState(false);
  const panelId = `filter-${name}`;

  if (available.length === 0) return null;

  const visible = showAll ? available : available.slice(0, 8);
  const hidden = available.length - visible.length;

  return (
    <fieldset className="border-b border-line">
      <legend className="sr-only">{legend}</legend>

      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-controls={panelId}
        className="flex w-full items-center justify-between gap-3 py-4 text-left"
      >
        <span className="text-[0.9375rem] text-ink">{legend}</span>
        <span className="flex items-center gap-2">
          {selected.length > 0 ? (
            <span className="rounded-sm bg-brand px-1.5 text-[0.6875rem] font-medium leading-5 text-white">
              {selected.length}
            </span>
          ) : null}
          <ChevronDown
            className={cn(
              "size-4 text-ink-muted transition-transform duration-[--duration-quick] ease-[--ease-quiet]",
              open && "rotate-180",
            )}
            aria-hidden="true"
          />
        </span>
      </button>

      <div
        id={panelId}
        className={cn(
          "grid transition-[grid-template-rows] duration-[--duration-settled] ease-[--ease-quiet]",
          open ? "grid-rows-[1fr]" : "grid-rows-[0fr]",
        )}
      >
        <div className="overflow-hidden">
          <ul className="space-y-2.5 pb-5">
            {visible.map((option) => {
              const id = `${name}-${option.slug}`;

              return (
                <li key={option.slug}>
                  <label
                    htmlFor={id}
                    className="flex cursor-pointer items-center gap-2.5 text-[0.9375rem] text-ink-soft transition-colors hover:text-ink"
                  >
                    <input
                      id={id}
                      type="checkbox"
                      name={name}
                      value={option.slug}
                      defaultChecked={selected.includes(option.slug)}
                      className="size-4 shrink-0 accent-[var(--color-ink)]"
                    />
                    {option.swatchHex ? (
                      <span
                        className="size-3.5 shrink-0 rounded-full border border-line-strong"
                        style={{ backgroundColor: option.swatchHex }}
                        aria-hidden="true"
                      />
                    ) : null}
                    <span className="flex-1">{option.name}</span>
                    <span className="text-[0.8125rem] tabular-nums text-ink-muted">
                      {option.count}
                    </span>
                  </label>
                </li>
              );
            })}

            {hidden > 0 ? (
              <li>
                <button
                  type="button"
                  onClick={() => setShowAll(true)}
                  className="text-[0.875rem] text-ink-soft underline underline-offset-4 hover:text-ink"
                >
                  Show {hidden} more
                  <span className="sr-only"> {legend.toLowerCase()} options</span>
                </button>
              </li>
            ) : null}
          </ul>
        </div>
      </div>
    </fieldset>
  );
}

export function FilterPanel({
  facets,
  query,
  resultCount,
  hasFilters,
}: {
  facets: CatalogueFacets;
  query: CatalogueQuery;
  resultCount: number;
  hasFilters: boolean;
}) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open]);

  // An onChange handler only ever fires once React has hydrated, so submitting
  // from here is inherently the enhanced path. The apply button below stays
  // rendered for anyone without JavaScript, and doubles as the result count.
  const submit = () => {
    formRef.current?.requestSubmit();
  };

  const categoryOptions = facets.categories.map((category) => ({
    slug: category.slug,
    name: category.name,
    count: category.count,
  }));

  const subcategoryOptions = facets.categories
    .filter(
      (category) =>
        query.category.includes(category.slug) ||
        category.children.some((child) => query.subcategory.includes(child.slug)),
    )
    .flatMap((category) => category.children);

  const body = (
    <form
      ref={formRef}
      action="/products"
      method="get"
      className="flex h-full flex-col"
      onChange={submit}
    >
      {/* Carries the search term through a filter change so a customer does not
          lose what they typed. */}
      {query.q ? <input type="hidden" name="q" value={query.q} /> : null}
      {query.sort !== "relevance" ? (
        <input type="hidden" name="sort" value={query.sort} />
      ) : null}

      <div className="flex-1 overflow-y-auto">
        <FilterGroup
          legend="Category"
          name="category"
          options={categoryOptions}
          selected={query.category}
          defaultOpen
        />

        {subcategoryOptions.length > 0 ? (
          <FilterGroup
            legend="Subcategory"
            name="subcategory"
            options={subcategoryOptions}
            selected={query.subcategory}
          />
        ) : null}

        <FilterGroup
          legend="Finish"
          name="finish"
          options={facets.finishes}
          selected={query.finish}
        />

        <FilterGroup
          legend="Material"
          name="material"
          options={facets.materials}
          selected={query.material}
        />

        <FilterGroup
          legend="Brand"
          name="brand"
          options={facets.brands}
          selected={query.brand}
        />

        <FilterGroup
          legend="Application"
          name="application"
          options={facets.applications}
          selected={query.application}
        />

        <FilterGroup
          legend="Availability"
          name="availability"
          options={facets.availability
            .filter((entry) => entry.count > 0)
            .map((entry) => ({
              slug: entry.value,
              name: availabilityLabel(entry.value),
              count: entry.count,
            }))}
          selected={query.availability}
        />
      </div>

      <div className="flex gap-2 border-t border-line bg-surface py-4">
        <Button type="submit" block>
          Show {resultCount} {resultCount === 1 ? "product" : "products"}
        </Button>
      </div>
    </form>
  );

  return (
    <>
      {/* ------------------------------------------------------- desktop */}
      <div className="hidden lg:block">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-medium text-ink">Filters</h2>
          {hasFilters ? (
            <button
              type="button"
              onClick={() => router.push("/products")}
              className="text-[0.8125rem] text-ink-soft underline underline-offset-4 hover:text-ink"
            >
              Clear all
            </button>
          ) : null}
        </div>
        {body}
      </div>

      {/* -------------------------------------------------------- mobile */}
      <div className="lg:hidden">
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="secondary"
            onClick={() => setOpen(true)}
            aria-expanded={open}
            aria-controls="filter-panel"
          >
            <SlidersHorizontal className="size-4" aria-hidden="true" />
            Filters
            {hasFilters ? (
              <span className="rounded-sm bg-ink px-1.5 text-xs leading-5 text-ink-inverse">
                On
              </span>
            ) : null}
          </Button>

          <SortSelect current={query.sort} query={query} />
        </div>

        {open ? (
          <div
            id="filter-panel"
            role="dialog"
            aria-modal="true"
            aria-label="Filter products"
            className="fixed inset-0 z-50 flex flex-col bg-surface"
          >
            <div className="flex h-16 shrink-0 items-center justify-between border-b border-line px-5">
              <h2 className="text-base font-medium">Filters</h2>
              <div className="flex items-center gap-3">
                {hasFilters ? (
                  <button
                    type="button"
                    onClick={() => {
                      setOpen(false);
                      router.push("/products");
                    }}
                    className="text-[0.8125rem] text-ink-soft underline underline-offset-4"
                  >
                    Clear all
                  </button>
                ) : null}
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="inline-flex size-9 items-center justify-center rounded-md hover:bg-surface-sunken"
                >
                  <X className="size-5" aria-hidden="true" />
                  <span className="sr-only">Close filters</span>
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto px-5">{body}</div>
          </div>
        ) : null}
      </div>
    </>
  );
}

/** Sort control, submitted as its own small form so it works without JavaScript. */
export function SortSelect({
  current,
  query,
}: {
  current: string;
  query: CatalogueQuery;
}) {
  const formRef = useRef<HTMLFormElement>(null);

  return (
    <form ref={formRef} action="/products" method="get" className="flex items-center gap-2">
      {query.q ? <input type="hidden" name="q" value={query.q} /> : null}
      {query.category.map((value) => (
        <input key={value} type="hidden" name="category" value={value} />
      ))}
      {query.subcategory.map((value) => (
        <input key={value} type="hidden" name="subcategory" value={value} />
      ))}
      {query.brand.map((value) => (
        <input key={value} type="hidden" name="brand" value={value} />
      ))}
      {query.material.map((value) => (
        <input key={value} type="hidden" name="material" value={value} />
      ))}
      {query.finish.map((value) => (
        <input key={value} type="hidden" name="finish" value={value} />
      ))}
      {query.application.map((value) => (
        <input key={value} type="hidden" name="application" value={value} />
      ))}
      {query.availability.map((value) => (
        <input key={value} type="hidden" name="availability" value={value} />
      ))}

      <label htmlFor="sort" className="sr-only">
        Sort products
      </label>
      <select
        id="sort"
        name="sort"
        defaultValue={current}
        onChange={() => formRef.current?.requestSubmit()}
        className="h-9 rounded-md border border-line-strong bg-surface-raised px-2.5 text-sm hover:border-ink-muted"
      >
        {SORT_OPTIONS.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      <noscript>
        <button type="submit" className="text-[0.8125rem] underline underline-offset-4">
          Apply
        </button>
      </noscript>
    </form>
  );
}
