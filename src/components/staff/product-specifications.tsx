import { Plus, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  createDefinitionAction,
  deleteSpecificationAction,
  saveSpecificationAction,
} from "@/server/actions/admin-product-parts";

/**
 * Technical specifications.
 *
 * The attributes themselves are rows, not columns, which is what lets an
 * administrator record something the catalogue has never held before without a
 * developer changing the database. Adding "Cycle tested to" once makes it
 * available on every product from that moment on.
 */

type Specification = {
  id: string;
  value: string;
  definitionId: string;
  definition: { key: string; label: string; unit: string | null };
};

type Definition = {
  id: string;
  label: string;
  unit: string | null;
  groupName: string | null;
};

export function ProductSpecifications({
  productId,
  specifications,
  definitions,
}: {
  productId: string;
  specifications: Specification[];
  definitions: Definition[];
}) {
  const used = new Set(specifications.map((entry) => entry.definitionId));
  const spare = definitions.filter((definition) => !used.has(definition.id));

  return (
    <section aria-labelledby="specifications-heading" className="space-y-5">
      <div>
        <h2 id="specifications-heading" className="text-lg text-ink">
          Specifications
        </h2>
        <p className="mt-1 text-[0.875rem] text-ink-muted">
          These appear as the specification table on the product page and are what an
          architect reads before asking for a price.
        </p>
      </div>

      {specifications.length > 0 ? (
        <ul className="divide-y divide-line rounded-lg border border-line">
          {specifications.map((specification) => (
            <li key={specification.id} className="flex flex-wrap items-end gap-3 p-3">
              <form
                action={saveSpecificationAction}
                className="flex min-w-0 flex-1 flex-wrap items-end gap-3"
              >
                <input type="hidden" name="productId" value={productId} />
                <input
                  type="hidden"
                  name="definitionId"
                  value={specification.definitionId}
                />

                <span className="w-48 shrink-0 text-[0.875rem] text-ink">
                  {specification.definition.label}
                  {specification.definition.unit ? (
                    <span className="text-ink-muted">
                      {" "}
                      ({specification.definition.unit})
                    </span>
                  ) : null}
                </span>

                <label className="min-w-0 flex-1">
                  <span className="sr-only">
                    Value for {specification.definition.label}
                  </span>
                  <input
                    name="value"
                    defaultValue={specification.value}
                    required
                    className="h-9 w-full rounded-md border border-line-strong bg-surface-raised px-2.5 text-[0.875rem]"
                  />
                </label>

                <Button type="submit" size="sm" variant="secondary">
                  Save
                </Button>
              </form>

              <form action={deleteSpecificationAction}>
                <input type="hidden" name="id" value={specification.id} />
                <Button
                  type="submit"
                  size="sm"
                  variant="ghost"
                  className="text-critical hover:text-critical"
                >
                  <Trash2 className="size-3.5" aria-hidden="true" />
                  <span className="sr-only">
                    Remove {specification.definition.label}
                  </span>
                </Button>
              </form>
            </li>
          ))}
        </ul>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-2">
        {spare.length > 0 ? (
          <form
            action={saveSpecificationAction}
            className="rounded-lg border border-dashed border-line-strong bg-surface-sunken p-4"
          >
            <input type="hidden" name="productId" value={productId} />
            <p className="text-[0.875rem] font-medium text-ink">Record a specification</p>

            <div className="mt-3 flex flex-wrap items-end gap-2">
              <label className="min-w-40 flex-1">
                <span className="block text-[0.75rem] text-ink-muted">Attribute</span>
                <select
                  name="definitionId"
                  required
                  className="mt-1 h-9 w-full rounded-md border border-line-strong bg-surface-raised px-2 text-[0.875rem]"
                >
                  {spare.map((definition) => (
                    <option key={definition.id} value={definition.id}>
                      {definition.label}
                      {definition.unit ? ` (${definition.unit})` : ""}
                    </option>
                  ))}
                </select>
              </label>

              <label className="min-w-40 flex-1">
                <span className="block text-[0.75rem] text-ink-muted">Value</span>
                <input
                  name="value"
                  required
                  className="mt-1 h-9 w-full rounded-md border border-line-strong bg-surface-raised px-2.5 text-[0.875rem]"
                />
              </label>

              <Button type="submit" size="sm">
                <Plus className="size-3.5" aria-hidden="true" />
                Add
              </Button>
            </div>
          </form>
        ) : null}

        <form
          action={createDefinitionAction}
          className="rounded-lg border border-dashed border-line-strong bg-surface-sunken p-4"
        >
          <input type="hidden" name="productId" value={productId} />
          <p className="text-[0.875rem] font-medium text-ink">
            Add a new attribute to the catalogue
          </p>
          <p className="mt-1 text-[0.8125rem] text-ink-muted">
            Every product can carry it once it exists here.
          </p>

          <div className="mt-3 flex flex-wrap items-end gap-2">
            <label className="min-w-40 flex-1">
              <span className="block text-[0.75rem] text-ink-muted">Attribute</span>
              <input
                name="label"
                required
                placeholder="Cycle tested to"
                className="mt-1 h-9 w-full rounded-md border border-line-strong bg-surface-raised px-2.5 text-[0.875rem]"
              />
            </label>

            <label className="w-24">
              <span className="block text-[0.75rem] text-ink-muted">Unit</span>
              <input
                name="unit"
                placeholder="mm"
                className="mt-1 h-9 w-full rounded-md border border-line-strong bg-surface-raised px-2.5 text-[0.875rem]"
              />
            </label>

            <label className="w-32">
              <span className="block text-[0.75rem] text-ink-muted">Group</span>
              <input
                name="groupName"
                placeholder="Performance"
                className="mt-1 h-9 w-full rounded-md border border-line-strong bg-surface-raised px-2.5 text-[0.875rem]"
              />
            </label>

            <Button type="submit" size="sm" variant="secondary">
              Create
            </Button>
          </div>
        </form>
      </div>
    </section>
  );
}
