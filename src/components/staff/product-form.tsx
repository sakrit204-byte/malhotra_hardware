"use client";

import { useActionState, useState } from "react";
import { Check, Save } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import { emptyAuthState } from "@/lib/auth-form";
import { saveProductAction } from "@/server/actions/admin-products";

/**
 * The product editor.
 *
 * One form, grouped the way somebody actually fills it in: what it is, where it
 * belongs, what it costs, and how it should appear. The subcategory list
 * narrows to the chosen category as you go, because offering every subcategory
 * in the catalogue is how products end up filed under the wrong parent.
 */

type Option = { id: string; name: string };
type CategoryOption = Option & { parentId: string | null };

export function ProductForm({
  product,
  options,
}: {
  product: {
    id: string;
    name: string;
    code: string;
    categoryId: string;
    subcategoryId: string | null;
    brandId: string | null;
    materialId: string | null;
    finishId: string | null;
    applicationId: string | null;
    shortDescription: string | null;
    description: string | null;
    dimensions: string | null;
    availability: string;
    isPublished: boolean;
    isFeatured: boolean;
    isPopular: boolean;
    metaTitle: string | null;
    metaDescription: string | null;
  } | null;
  options: {
    categories: CategoryOption[];
    brands: Option[];
    materials: Option[];
    finishes: Option[];
    applications: Option[];
  };
}) {
  const [state, action, pending] = useActionState(
    saveProductAction,
    emptyAuthState,
  );
  const [categoryId, setCategoryId] = useState(product?.categoryId ?? "");

  /**
   * React empties the form once the action has run, so after a rejected save
   * the fields fall back to whatever they were given as defaults. Those
   * defaults are the values that were just submitted, which is how a long
   * description survives a complaint about the product code.
   */
  const value = (field: string, stored: string | null | undefined) =>
    state.values[field] ?? stored ?? "";

  const checked = (field: string, stored: boolean | undefined) =>
    state.status === "error" ? state.values[field] === "on" : (stored ?? false);

  // The chosen category has to follow a rejected save too, or the subcategory
  // list would offer the wrong branch of the tree.
  const [settled, setSettled] = useState(state);
  if (state !== settled) {
    setSettled(state);
    if (state.status === "error" && state.values.categoryId) {
      setCategoryId(state.values.categoryId);
    }
  }

  const parents = options.categories.filter(
    (category) => category.parentId === null,
  );
  const children = options.categories.filter(
    (category) => category.parentId === categoryId,
  );

  return (
    <form action={action} className="space-y-8">
      {product ? <input type="hidden" name="id" value={product.id} /> : null}

      {state.status === "sent" && state.message ? (
        <p
          role="status"
          className="flex items-center gap-2 text-[0.9375rem] text-positive"
        >
          <Check className="size-4" aria-hidden="true" />
          {state.message}
        </p>
      ) : null}

      {state.errors.form ? (
        <p role="alert" className="text-[0.9375rem] text-critical">
          {state.errors.form}
        </p>
      ) : null}

      {/* ------------------------------------------------------ identity */}
      <fieldset className="space-y-5">
        <legend className="text-lg text-ink">What it is</legend>

        <div className="grid gap-5 sm:grid-cols-2">
          <Field
            name="name"
            label="Product name"
            required
            error={state.errors.name}
          >
            {(control) => (
              <Input {...control} defaultValue={value("name", product?.name)} />
            )}
          </Field>

          <Field
            name="code"
            label="Product code"
            required
            error={state.errors.code}
            hint="Customers quote this on the phone. Use spaces, never a hyphen."
          >
            {(control) => (
              <Input
                {...control}
                defaultValue={value("code", product?.code)}
                placeholder="ME DH 2010"
                className="font-mono"
              />
            )}
          </Field>
        </div>

        <Field
          name="shortDescription"
          label="Short description"
          error={state.errors.shortDescription}
          hint="One sentence. This is what appears under the name in search results."
        >
          {(control) => (
            <Textarea
              {...control}
              rows={2}
              defaultValue={value(
                "shortDescription",
                product?.shortDescription,
              )}
            />
          )}
        </Field>

        <Field
          name="description"
          label="Full description"
          error={state.errors.description}
        >
          {(control) => (
            <Textarea
              {...control}
              rows={6}
              defaultValue={value("description", product?.description)}
            />
          )}
        </Field>
      </fieldset>

      {/* ---------------------------------------------------- where it sits */}
      <fieldset className="space-y-5 border-t border-line pt-8">
        <legend className="text-lg text-ink">Where it belongs</legend>

        <div className="grid gap-5 sm:grid-cols-2">
          <Field
            name="categoryId"
            label="Category"
            required
            error={state.errors.categoryId}
          >
            {(control) => (
              <Select
                {...control}
                value={categoryId}
                onChange={(event) => setCategoryId(event.target.value)}
              >
                <option value="">Choose a category</option>
                {parents.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </Select>
            )}
          </Field>

          <Field
            name="subcategoryId"
            label="Subcategory"
            error={state.errors.subcategoryId}
            hint={
              children.length === 0
                ? "This category has no subcategories."
                : undefined
            }
          >
            {(control) => (
              <Select
                {...control}
                defaultValue={value("subcategoryId", product?.subcategoryId)}
                disabled={children.length === 0}
              >
                <option value="">Not filed under one</option>
                {children.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </Select>
            )}
          </Field>

          <Field name="brandId" label="Brand" error={state.errors.brandId}>
            {(control) => (
              <Select
                {...control}
                defaultValue={value("brandId", product?.brandId)}
              >
                <option value="">No brand</option>
                {options.brands.map((brand) => (
                  <option key={brand.id} value={brand.id}>
                    {brand.name}
                  </option>
                ))}
              </Select>
            )}
          </Field>

          <Field
            name="applicationId"
            label="Application"
            error={state.errors.applicationId}
          >
            {(control) => (
              <Select
                {...control}
                defaultValue={value("applicationId", product?.applicationId)}
              >
                <option value="">Not specified</option>
                {options.applications.map((application) => (
                  <option key={application.id} value={application.id}>
                    {application.name}
                  </option>
                ))}
              </Select>
            )}
          </Field>

          <Field
            name="materialId"
            label="Material"
            error={state.errors.materialId}
          >
            {(control) => (
              <Select
                {...control}
                defaultValue={value("materialId", product?.materialId)}
              >
                <option value="">Not specified</option>
                {options.materials.map((material) => (
                  <option key={material.id} value={material.id}>
                    {material.name}
                  </option>
                ))}
              </Select>
            )}
          </Field>

          <Field name="finishId" label="Finish" error={state.errors.finishId}>
            {(control) => (
              <Select
                {...control}
                defaultValue={value("finishId", product?.finishId)}
              >
                <option value="">Not specified</option>
                {options.finishes.map((finish) => (
                  <option key={finish.id} value={finish.id}>
                    {finish.name}
                  </option>
                ))}
              </Select>
            )}
          </Field>
        </div>
      </fieldset>

      {/* ---------------------------------------------------- supply terms */}
      <fieldset className="space-y-5 border-t border-line pt-8">
        <legend className="text-lg text-ink">Supply</legend>

        <div className="grid gap-5 sm:grid-cols-2">
          <Field name="availability" label="Availability" required>
            {(control) => (
              <Select
                {...control}
                defaultValue={
                  value("availability", product?.availability) || "ON_REQUEST"
                }
              >
                <option value="IN_STOCK">In stock</option>
                <option value="LIMITED">Limited stock</option>
                <option value="MADE_TO_ORDER">Made to order</option>
                <option value="OUT_OF_STOCK">Out of stock</option>
                <option value="ON_REQUEST">Available on request</option>
              </Select>
            )}
          </Field>

          <Field
            name="dimensions"
            label="Dimensions"
            error={state.errors.dimensions}
          >
            {(control) => (
              <Input
                {...control}
                defaultValue={value("dimensions", product?.dimensions)}
                placeholder="125 mm lever, 52 mm rose"
              />
            )}
          </Field>
        </div>
      </fieldset>

      {/* ------------------------------------------------------ appearance */}
      <fieldset className="space-y-4 border-t border-line pt-8">
        <legend className="text-lg text-ink">How it appears</legend>

        <div className="space-y-3">
          {[
            {
              name: "isPublished",
              label: "Published",
              hint: "Visible in the catalogue, the filters and the sitemap.",
              checked: checked("isPublished", product?.isPublished),
            },
            {
              name: "isFeatured",
              label: "Featured",
              hint: "Eligible for the piece shown beside the hero photograph.",
              checked: checked("isFeatured", product?.isFeatured),
            },
            {
              name: "isPopular",
              label: "Popular",
              hint: "Appears in the popular products row on the home page.",
              checked: checked("isPopular", product?.isPopular),
            },
          ].map((toggle) => (
            <label
              key={toggle.name}
              htmlFor={toggle.name}
              className="flex cursor-pointer items-start gap-3"
            >
              <input
                id={toggle.name}
                name={toggle.name}
                type="checkbox"
                defaultChecked={toggle.checked}
                className="mt-1 size-4 shrink-0 accent-[var(--color-ink)]"
              />
              <span>
                <span className="block text-[0.9375rem] text-ink">
                  {toggle.label}
                </span>
                <span className="block text-[0.875rem] text-ink-muted">
                  {toggle.hint}
                </span>
              </span>
            </label>
          ))}
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <Field
            name="metaTitle"
            label="Search title"
            error={state.errors.metaTitle}
          >
            {(control) => (
              <Input
                {...control}
                defaultValue={value("metaTitle", product?.metaTitle)}
                placeholder="Leave empty to use the product name"
              />
            )}
          </Field>

          <Field
            name="metaDescription"
            label="Search description"
            error={state.errors.metaDescription}
          >
            {(control) => (
              <Input
                {...control}
                defaultValue={value(
                  "metaDescription",
                  product?.metaDescription,
                )}
              />
            )}
          </Field>
        </div>
      </fieldset>

      <div className="sticky bottom-0 -mx-1 border-t border-line bg-surface/95 px-1 py-4 backdrop-blur-md">
        <Button type="submit" size="lg" disabled={pending}>
          <Save className="size-4" aria-hidden="true" />
          {pending ? "Saving" : product ? "Save changes" : "Create product"}
        </Button>
      </div>
    </form>
  );
}
