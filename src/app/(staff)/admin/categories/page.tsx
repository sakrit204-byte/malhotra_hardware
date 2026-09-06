import type { Metadata } from "next";
import { ArrowDown, ArrowUp, Eye, EyeOff, Plus, Trash2 } from "lucide-react";

import { CategoryForm } from "@/components/staff/category-form";
import { Button } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";
import {
  createTaxonomyValueAction,
  deleteCategoryAction,
  moveCategoryAction,
  toggleCategoryHiddenAction,
} from "@/server/actions/admin-taxonomy";
import { requireRole } from "@/server/auth/guards";
import { getEditorOptions, listCategoriesForAdmin } from "@/server/repositories/admin";

export const metadata: Metadata = {
  title: "Categories and filters",
  robots: { index: false, follow: false },
};

/**
 * Categories and the filter values behind them.
 *
 * The order set here is the order customers browse in, top to bottom. A
 * category holding products cannot be removed, only hidden, because the
 * alternative is products with nowhere to sit.
 */
export default async function AdminCategoriesPage() {
  await requireRole("ADMIN", "/admin/categories");

  const [tree, options] = await Promise.all([
    listCategoriesForAdmin(),
    getEditorOptions(),
  ]);

  const parents = tree.map((category) => ({ id: category.id, name: category.name }));

  return (
    <div className="mx-auto max-w-5xl px-5 py-8 sm:px-8 lg:py-10">
      <header>
        <p className="eyebrow">Catalogue</p>
        <h1 className="mt-2 text-[2rem] leading-[1.1]">Categories and filters</h1>
        <p className="mt-3 max-w-2xl text-ink-soft">
          The order below is the order customers browse in. Filter values are shared across
          the whole catalogue, so adding a finish here makes it available to every product.
        </p>
      </header>

      <div className="mt-8">
        <CategoryForm parents={parents} />
      </div>

      <ul className="mt-8 space-y-3">
        {tree.map((category, index) => {
          const held =
            category._count.productsAsCategory +
            category._count.productsAsSubcategory +
            category._count.children;

          return (
            <li
              key={category.id}
              className="rounded-lg border border-line bg-surface-raised"
            >
              <div className="flex flex-wrap items-center gap-3 p-4">
                <div className="min-w-0 flex-1">
                  <p className="flex items-center gap-2 text-ink">
                    {category.name}
                    {category.isHidden ? <Chip tone="neutral">Hidden</Chip> : null}
                    {category.isFeatured ? <Chip tone="brass">On the home page</Chip> : null}
                  </p>
                  <p className="mt-0.5 text-[0.875rem] text-ink-muted">
                    {category._count.productsAsCategory}{" "}
                    {category._count.productsAsCategory === 1 ? "product" : "products"},{" "}
                    {category.children.length}{" "}
                    {category.children.length === 1 ? "subcategory" : "subcategories"}
                  </p>
                </div>

                <div className="flex w-64 shrink-0 flex-wrap justify-end gap-1.5">
                  {index > 0 ? (
                    <MoveButton id={category.id} direction="up" label="Move up">
                      <ArrowUp className="size-3.5" aria-hidden="true" />
                    </MoveButton>
                  ) : null}

                  {index < tree.length - 1 ? (
                    <MoveButton id={category.id} direction="down" label="Move down">
                      <ArrowDown className="size-3.5" aria-hidden="true" />
                    </MoveButton>
                  ) : null}

                  <form action={toggleCategoryHiddenAction}>
                    <input type="hidden" name="id" value={category.id} />
                    <Button type="submit" size="sm" variant="ghost">
                      {category.isHidden ? (
                        <Eye className="size-3.5" aria-hidden="true" />
                      ) : (
                        <EyeOff className="size-3.5" aria-hidden="true" />
                      )}
                      {category.isHidden ? "Show" : "Hide"}
                    </Button>
                  </form>

                  {held === 0 ? (
                    <form action={deleteCategoryAction}>
                      <input type="hidden" name="id" value={category.id} />
                      <Button
                        type="submit"
                        size="sm"
                        variant="ghost"
                        className="text-critical hover:text-critical"
                      >
                        <Trash2 className="size-3.5" aria-hidden="true" />
                        Remove
                      </Button>
                    </form>
                  ) : null}
                </div>
              </div>

              {category.children.length > 0 ? (
                <ul className="divide-y divide-line border-t border-line">
                  {category.children.map((child, childIndex) => (
                    <li
                      key={child.id}
                      className="flex flex-wrap items-center gap-3 px-4 py-2.5 pl-8"
                    >
                      <span className="min-w-0 flex-1 text-[0.9375rem] text-ink-soft">
                        {child.name}
                        {child.isHidden ? (
                          <span className="ml-2 text-[0.8125rem] text-ink-muted">
                            Hidden
                          </span>
                        ) : null}
                      </span>

                      <span className="w-8 shrink-0 text-right text-[0.875rem] tabular-nums text-ink-muted">
                        {child._count.productsAsSubcategory}
                      </span>

                      <span className="flex w-64 shrink-0 justify-end gap-1.5">
                        {childIndex > 0 ? (
                          <MoveButton id={child.id} direction="up" label="Move up">
                            <ArrowUp className="size-3.5" aria-hidden="true" />
                          </MoveButton>
                        ) : null}

                        {childIndex < category.children.length - 1 ? (
                          <MoveButton id={child.id} direction="down" label="Move down">
                            <ArrowDown className="size-3.5" aria-hidden="true" />
                          </MoveButton>
                        ) : null}

                        <form action={toggleCategoryHiddenAction}>
                          <input type="hidden" name="id" value={child.id} />
                          <Button type="submit" size="sm" variant="ghost">
                            {child.isHidden ? "Show" : "Hide"}
                          </Button>
                        </form>

                        {child._count.productsAsCategory +
                          child._count.productsAsSubcategory ===
                        0 ? (
                          <form action={deleteCategoryAction}>
                            <input type="hidden" name="id" value={child.id} />
                            <Button
                              type="submit"
                              size="sm"
                              variant="ghost"
                              className="text-critical hover:text-critical"
                            >
                              Remove
                            </Button>
                          </form>
                        ) : null}
                      </span>
                    </li>
                  ))}
                </ul>
              ) : null}
            </li>
          );
        })}
      </ul>

      <section aria-labelledby="filters-heading" className="mt-14 border-t border-line pt-10">
        <h2 id="filters-heading" className="text-lg text-ink">
          Filter values
        </h2>
        <p className="mt-1 max-w-2xl text-[0.875rem] text-ink-muted">
          Brands, materials, finishes and applications. These are what the filter panel
          offers customers, and what a product is tagged with in the editor.
        </p>

        <div className="mt-6 grid gap-6 sm:grid-cols-2">
          <TaxonomyColumn
            kind="brand"
            title="Brands"
            values={options.brands}
            placeholder="Yale"
          />
          <TaxonomyColumn
            kind="material"
            title="Materials"
            values={options.materials}
            placeholder="Solid brass"
          />
          <TaxonomyColumn
            kind="finish"
            title="Finishes"
            values={options.finishes}
            placeholder="Antique brass"
            swatch
          />
          <TaxonomyColumn
            kind="application"
            title="Applications"
            values={options.applications}
            placeholder="Main entrance"
          />
        </div>
      </section>
    </div>
  );
}

function MoveButton({
  id,
  direction,
  label,
  children,
}: {
  id: string;
  direction: "up" | "down";
  label: string;
  children: React.ReactNode;
}) {
  return (
    <form action={moveCategoryAction}>
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="direction" value={direction} />
      <Button type="submit" size="sm" variant="ghost">
        {children}
        <span className="sr-only">{label}</span>
      </Button>
    </form>
  );
}

function TaxonomyColumn({
  kind,
  title,
  values,
  placeholder,
  swatch = false,
}: {
  kind: string;
  title: string;
  values: { id: string; name: string }[];
  placeholder: string;
  swatch?: boolean;
}) {
  return (
    <div className="rounded-lg border border-line bg-surface-raised p-4">
      <h3 className="text-[0.9375rem] text-ink">{title}</h3>

      <ul className="mt-3 flex flex-wrap gap-1.5">
        {values.map((value) => (
          <li key={value.id}>
            <Chip tone="neutral">{value.name}</Chip>
          </li>
        ))}
        {values.length === 0 ? (
          <li className="text-[0.875rem] text-ink-muted">None yet.</li>
        ) : null}
      </ul>

      <form action={createTaxonomyValueAction} className="mt-4 flex flex-wrap gap-2">
        <input type="hidden" name="kind" value={kind} />
        <label className="min-w-32 flex-1">
          <span className="sr-only">Add to {title}</span>
          <input
            name="name"
            required
            placeholder={placeholder}
            className="h-9 w-full rounded-md border border-line-strong bg-surface px-2.5 text-[0.875rem]"
          />
        </label>

        {swatch ? (
          <label>
            <span className="sr-only">Swatch colour</span>
            <input
              name="swatchHex"
              type="color"
              defaultValue="#a3803f"
              className="h-9 w-12 cursor-pointer rounded-md border border-line-strong bg-surface p-1"
            />
          </label>
        ) : null}

        <Button type="submit" size="sm" variant="secondary">
          <Plus className="size-3.5" aria-hidden="true" />
          Add
        </Button>
      </form>
    </div>
  );
}
