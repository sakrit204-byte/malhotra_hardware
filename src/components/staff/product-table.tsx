"use client";

import Image from "next/image";
import Link from "next/link";
import { useActionState, useState } from "react";
import { Check, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";
import { availabilityLabel, availabilityTone } from "@/lib/catalogue";
import { emptyAuthState } from "@/lib/auth-form";
import { cn } from "@/lib/cn";
import { bulkProductAction } from "@/server/actions/admin-bulk";
import { toggleProductPublishedAction } from "@/server/actions/admin-products";

/**
 * The catalogue, as something an administrator can actually operate.
 *
 * Rows are selectable, and the bar that appears when anything is selected does
 * to the whole selection what the row buttons do to one product. Putting a
 * range on sale, withdrawing a discontinued line or promoting eight pieces to
 * the home page are each one action rather than thirty visits to an editor.
 *
 * Selection is deliberately explicit. Choosing everything on the page selects
 * the page, and taking every match needs a second, separate press that says how
 * many that is, because the difference between thirty products and five hundred
 * should never be a detail somebody discovers afterwards.
 */

type Row = {
  id: string;
  name: string;
  code: string;
  isPublished: boolean;
  isFeatured: boolean;
  isPopular: boolean;
  availability: string;
  category: string;
  image: string | null;
  variants: number;
  inquiries: number;
};

export function ProductTable({
  rows,
  matchingIds,
  total,
  categories,
}: {
  rows: Row[];
  matchingIds: string[];
  total: number;
  categories: Array<{ id: string; name: string }>;
}) {
  const [selected, setSelected] = useState<string[]>([]);
  const [state, action, pending] = useActionState(bulkProductAction, emptyAuthState);
  const [intent, setIntent] = useState("publish");

  // A completed change leaves nothing selected, because the rows it applied to
  // may no longer match the filters that are on screen.
  const [settled, setSettled] = useState(state);
  if (state !== settled) {
    setSettled(state);
    if (state.status === "sent") setSelected([]);
  }

  const pageIds = rows.map((row) => row.id);
  const allOnPage = pageIds.length > 0 && pageIds.every((id) => selected.includes(id));
  const everyMatch = matchingIds.length > 0 && selected.length === matchingIds.length;

  const toggle = (id: string) =>
    setSelected((current) =>
      current.includes(id) ? current.filter((value) => value !== id) : [...current, id],
    );

  return (
    <div>
      {state.status === "sent" && state.message ? (
        <p
          role="status"
          className="mb-4 flex items-center gap-2 border-t border-positive/30 pt-3 text-[0.9375rem] text-positive"
        >
          <Check className="size-4 shrink-0" aria-hidden="true" />
          {state.message}
        </p>
      ) : null}

      {state.errors.form ? (
        <p role="alert" className="mb-4 text-[0.9375rem] text-critical">
          {state.errors.form}
        </p>
      ) : null}

      {/* ------------------------------------------------------- bulk bar */}
      {selected.length > 0 ? (
        <form
          action={action}
          className="sticky top-0 z-20 mb-4 flex flex-wrap items-center gap-3 border-y border-ink bg-surface-raised px-4 py-3"
        >
          <input type="hidden" name="ids" value={selected.join(",")} />

          <p className="figure shrink-0 text-ink">
            {selected.length} selected
          </p>

          {!everyMatch && matchingIds.length > selected.length ? (
            <Button
              type="button"
              size="sm"
              variant="quiet"
              onClick={() => setSelected(matchingIds)}
            >
              Take all {matchingIds.length} matching
            </Button>
          ) : null}

          <label className="flex items-center gap-2">
            <span className="sr-only">What to do with the selection</span>
            <select
              name="intent"
              value={intent}
              onChange={(event) => setIntent(event.target.value)}
              className="h-9 border border-line-strong bg-surface px-2 text-[0.875rem]"
            >
              <optgroup label="On the site">
                <option value="publish">Publish</option>
                <option value="withdraw">Withdraw</option>
              </optgroup>
              <optgroup label="On the home page">
                <option value="feature">Add to featured</option>
                <option value="unfeature">Remove from featured</option>
                <option value="popular">Add to popular</option>
                <option value="unpopular">Remove from popular</option>
              </optgroup>
              <optgroup label="Change">
                <option value="category">Move to category</option>
                <option value="availability">Set availability</option>
              </optgroup>
              <optgroup label="Careful">
                <option value="delete">Remove from the catalogue</option>
              </optgroup>
            </select>
          </label>

          {intent === "category" ? (
            <label className="flex items-center gap-2">
              <span className="sr-only">Category to move into</span>
              <select
                name="categoryId"
                required
                className="h-9 border border-line-strong bg-surface px-2 text-[0.875rem]"
              >
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </label>
          ) : null}

          {intent === "availability" ? (
            <label className="flex items-center gap-2">
              <span className="sr-only">Availability to set</span>
              <select
                name="availability"
                className="h-9 border border-line-strong bg-surface px-2 text-[0.875rem]"
              >
                <option value="IN_STOCK">In stock</option>
                <option value="LIMITED">Limited stock</option>
                <option value="MADE_TO_ORDER">Made to order</option>
                <option value="OUT_OF_STOCK">Out of stock</option>
                <option value="ON_REQUEST">On request</option>
              </select>
            </label>
          ) : null}

          <Button
            type="submit"
            size="sm"
            variant={intent === "delete" ? "danger" : "primary"}
            disabled={pending}
          >
            {pending ? "Applying" : "Apply"}
          </Button>

          <Button
            type="button"
            size="sm"
            variant="ghost"
            className="ms-auto"
            onClick={() => setSelected([])}
          >
            <X className="size-3.5" aria-hidden="true" />
            Clear
          </Button>
        </form>
      ) : null}

      {/* ---------------------------------------------------------- table */}
      <div className="overflow-x-auto">
        <table className="w-full min-w-[58rem] border-collapse text-[0.9375rem]">
          <caption className="sr-only">
            Every product in the catalogue, {total} in total
          </caption>
          <thead>
            <tr className="note border-b border-ink text-left">
              <th scope="col" className="w-10 py-3">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={allOnPage}
                    onChange={() =>
                      setSelected(allOnPage
                        ? selected.filter((id) => !pageIds.includes(id))
                        : [...new Set([...selected, ...pageIds])])
                    }
                    className="size-4 accent-[var(--color-ink)]"
                  />
                  <span className="sr-only">Select every product on this page</span>
                </label>
              </th>
              <th scope="col" className="py-3 pr-4 font-medium">Product</th>
              <th scope="col" className="py-3 pr-4 font-medium">Category</th>
              <th scope="col" className="py-3 pr-4 font-medium">Availability</th>
              <th scope="col" className="py-3 pr-4 font-medium">Home page</th>
              <th scope="col" className="py-3 pr-4 text-right font-medium">Asked about</th>
              <th scope="col" className="py-3 font-medium">Published</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-line">
            {rows.map((row) => {
              const checked = selected.includes(row.id);

              return (
                <tr
                  key={row.id}
                  className={cn(
                    "transition-colors",
                    checked ? "bg-brass-wash" : "hover:bg-surface-sunken",
                  )}
                >
                  <td className="py-3">
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggle(row.id)}
                        className="size-4 accent-[var(--color-ink)]"
                      />
                      <span className="sr-only">Select {row.name}</span>
                    </label>
                  </td>

                  <th scope="row" className="py-3 pr-4 text-left font-normal">
                    <Link
                      href={`/admin/products/${row.id}`}
                      className="flex items-center gap-3"
                    >
                      <span className="relative size-11 shrink-0 overflow-hidden border border-line bg-surface-sunken">
                        {row.image ? (
                          <Image
                            src={row.image}
                            alt=""
                            fill
                            sizes="2.75rem"
                            className="object-cover"
                          />
                        ) : null}
                      </span>
                      <span className="min-w-0">
                        <span className="block text-ink">{row.name}</span>
                        <span className="note block">
                          {row.code}
                          {row.variants > 0 ? `, ${row.variants} options` : ""}
                        </span>
                      </span>
                    </Link>
                  </th>

                  <td className="py-3 pr-4 text-ink-soft">{row.category}</td>

                  <td className="py-3 pr-4">
                    <Chip tone={availabilityTone(row.availability)}>
                      {availabilityLabel(row.availability)}
                    </Chip>
                  </td>

                  <td className="py-3 pr-4">
                    <span className="flex flex-wrap gap-1">
                      {row.isFeatured ? <Chip tone="brick">Featured</Chip> : null}
                      {row.isPopular ? <Chip tone="brass">Popular</Chip> : null}
                      {!row.isFeatured && !row.isPopular ? (
                        <span className="note">Not shown</span>
                      ) : null}
                    </span>
                  </td>

                  <td className="py-3 pr-4 text-right">
                    <span className="figure text-ink-soft">{row.inquiries}</span>
                  </td>

                  <td className="py-3">
                    <form action={toggleProductPublishedAction}>
                      <input type="hidden" name="id" value={row.id} />
                      <Button
                        type="submit"
                        size="sm"
                        variant={row.isPublished ? "secondary" : "primary"}
                      >
                        {row.isPublished ? "Withdraw" : "Publish"}
                      </Button>
                    </form>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
