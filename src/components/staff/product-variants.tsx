import { Plus, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";
import { availabilityLabel, availabilityTone } from "@/lib/catalogue";
import {
  deleteVariantAction,
  saveVariantAction,
} from "@/server/actions/admin-product-parts";

/**
 * Options within a product: sizes, finishes, handings.
 *
 * A customer asking for a lever in antique brass and a customer asking for the
 * same lever in matt black are asking about one product, so the options are
 * rows here rather than separate products cluttering the catalogue.
 *
 * An option that has already appeared on an inquiry is deactivated rather than
 * destroyed, so that paperwork already sent to a customer still reads correctly.
 */

type Variant = {
  id: string;
  name: string;
  code: string;
  size: string | null;
  finishId: string | null;
  availability: string;
  isActive: boolean;
};

const AVAILABILITY = [
  ["IN_STOCK", "In stock"],
  ["LIMITED", "Limited stock"],
  ["MADE_TO_ORDER", "Made to order"],
  ["OUT_OF_STOCK", "Out of stock"],
  ["ON_REQUEST", "On request"],
] as const;

export function ProductVariants({
  productId,
  variants,
  finishes,
}: {
  productId: string;
  variants: Variant[];
  finishes: { id: string; name: string }[];
}) {
  return (
    <section aria-labelledby="variants-heading" className="space-y-5">
      <div>
        <h2 id="variants-heading" className="text-lg text-ink">
          Options
        </h2>
        <p className="mt-1 text-[0.875rem] text-ink-muted">
          Sizes and finishes a customer chooses between. Leave this empty if the product
          comes one way only.
        </p>
      </div>

      {variants.length > 0 ? (
        <ul className="divide-y divide-line rounded-lg border border-line">
          {variants.map((variant) => (
            <li key={variant.id} className="p-4">
              <form action={saveVariantAction} className="space-y-3">
                <input type="hidden" name="productId" value={productId} />
                <input type="hidden" name="id" value={variant.id} />

                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  <label className="block">
                    <span className="block text-[0.75rem] text-ink-muted">Name</span>
                    <input
                      name="name"
                      defaultValue={variant.name}
                      required
                      className="mt-1 h-9 w-full rounded-md border border-line-strong bg-surface-raised px-2.5 text-[0.875rem]"
                    />
                  </label>

                  <label className="block">
                    <span className="block text-[0.75rem] text-ink-muted">Code</span>
                    <input
                      name="code"
                      defaultValue={variant.code}
                      required
                      className="mt-1 h-9 w-full rounded-md border border-line-strong bg-surface-raised px-2.5 font-mono text-[0.875rem]"
                    />
                  </label>

                  <label className="block">
                    <span className="block text-[0.75rem] text-ink-muted">Size</span>
                    <input
                      name="size"
                      defaultValue={variant.size ?? ""}
                      className="mt-1 h-9 w-full rounded-md border border-line-strong bg-surface-raised px-2.5 text-[0.875rem]"
                    />
                  </label>

                  <label className="block">
                    <span className="block text-[0.75rem] text-ink-muted">Finish</span>
                    <select
                      name="finishId"
                      defaultValue={variant.finishId ?? ""}
                      className="mt-1 h-9 w-full rounded-md border border-line-strong bg-surface-raised px-2 text-[0.875rem]"
                    >
                      <option value="">Same as the product</option>
                      {finishes.map((finish) => (
                        <option key={finish.id} value={finish.id}>
                          {finish.name}
                        </option>
                      ))}
                    </select>
                  </label>

                </div>

                <div className="flex flex-wrap items-center gap-3">
                  <label className="flex items-center gap-2 text-[0.875rem] text-ink-soft">
                    <span className="text-[0.75rem] text-ink-muted">Availability</span>
                    <select
                      name="availability"
                      defaultValue={variant.availability}
                      className="h-9 rounded-md border border-line-strong bg-surface-raised px-2 text-[0.875rem]"
                    >
                      {AVAILABILITY.map(([value, label]) => (
                        <option key={value} value={value}>
                          {label}
                        </option>
                      ))}
                    </select>
                  </label>

                  <Chip tone={availabilityTone(variant.availability)}>
                    {variant.isActive
                      ? availabilityLabel(variant.availability)
                      : "Withdrawn"}
                  </Chip>

                  <span className="ms-auto flex gap-2">
                    <Button type="submit" size="sm" variant="secondary">
                      Save
                    </Button>
                  </span>
                </div>
              </form>

              <form action={deleteVariantAction} className="mt-2">
                <input type="hidden" name="id" value={variant.id} />
                <Button
                  type="submit"
                  size="sm"
                  variant="ghost"
                  className="text-critical hover:text-critical"
                >
                  <Trash2 className="size-3.5" aria-hidden="true" />
                  Remove this option
                </Button>
              </form>
            </li>
          ))}
        </ul>
      ) : null}

      <form
        action={saveVariantAction}
        className="rounded-lg border border-dashed border-line-strong bg-surface-sunken p-4"
      >
        <input type="hidden" name="productId" value={productId} />
        <p className="text-[0.875rem] font-medium text-ink">Add an option</p>

        <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <label className="block">
            <span className="block text-[0.75rem] text-ink-muted">Name</span>
            <input
              name="name"
              required
              placeholder="Antique brass, 125 mm"
              className="mt-1 h-9 w-full rounded-md border border-line-strong bg-surface-raised px-2.5 text-[0.875rem]"
            />
          </label>

          <label className="block">
            <span className="block text-[0.75rem] text-ink-muted">Code</span>
            <input
              name="code"
              required
              placeholder="ME DH 2010 AB"
              className="mt-1 h-9 w-full rounded-md border border-line-strong bg-surface-raised px-2.5 font-mono text-[0.875rem]"
            />
          </label>

          <label className="block">
            <span className="block text-[0.75rem] text-ink-muted">Size</span>
            <input
              name="size"
              className="mt-1 h-9 w-full rounded-md border border-line-strong bg-surface-raised px-2.5 text-[0.875rem]"
            />
          </label>

          <label className="block">
            <span className="block text-[0.75rem] text-ink-muted">Finish</span>
            <select
              name="finishId"
              className="mt-1 h-9 w-full rounded-md border border-line-strong bg-surface-raised px-2 text-[0.875rem]"
            >
              <option value="">Same as the product</option>
              {finishes.map((finish) => (
                <option key={finish.id} value={finish.id}>
                  {finish.name}
                </option>
              ))}
            </select>
          </label>

        </div>

        <div className="mt-3 flex items-center gap-3">
          <label className="flex items-center gap-2">
            <span className="text-[0.75rem] text-ink-muted">Availability</span>
            <select
              name="availability"
              defaultValue="IN_STOCK"
              className="h-9 rounded-md border border-line-strong bg-surface-raised px-2 text-[0.875rem]"
            >
              {AVAILABILITY.map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>

          <Button type="submit" size="sm">
            <Plus className="size-3.5" aria-hidden="true" />
            Add
          </Button>
        </div>
      </form>
    </section>
  );
}
