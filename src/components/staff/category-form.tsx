"use client";

import { useActionState, useState } from "react";
import { Plus, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import { emptyAuthState } from "@/lib/auth-form";
import { saveCategoryAction } from "@/server/actions/admin-taxonomy";

/**
 * Adding or renaming a category.
 *
 * The form stays folded away until it is wanted, because on this screen the
 * list is the point and a permanently open form pushes it off the page.
 */
export function CategoryForm({
  parents,
}: {
  parents: { id: string; name: string }[];
}) {
  const [state, action, pending] = useActionState(
    saveCategoryAction,
    emptyAuthState,
  );
  const [open, setOpen] = useState(false);

  // A successful save closes the form, so the new row is what you are left
  // looking at rather than the fields that created it.
  const [lastStatus, setLastStatus] = useState(state.status);
  if (state.status !== lastStatus) {
    setLastStatus(state.status);
    if (state.status === "sent" && open) setOpen(false);
  }

  if (!open) {
    return (
      <div className="flex items-center gap-3">
        <Button onClick={() => setOpen(true)}>
          <Plus className="size-4" aria-hidden="true" />
          New category
        </Button>

        {state.status === "sent" && state.message ? (
          <p role="status" className="text-[0.9375rem] text-positive">
            {state.message}
          </p>
        ) : null}
      </div>
    );
  }

  return (
    <form
      action={action}
      className="rounded-lg border border-line bg-surface-raised p-5"
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-lg text-ink">A new category</h2>
          <p className="mt-1 text-[0.875rem] text-ink-muted">
            Categories go two levels deep: a category, and subcategories inside
            it.
          </p>
        </div>

        <Button variant="ghost" size="icon" onClick={() => setOpen(false)}>
          <X className="size-4" aria-hidden="true" />
          <span className="sr-only">Close this form</span>
        </Button>
      </div>

      {state.errors.form ? (
        <p role="alert" className="mt-3 text-[0.9375rem] text-critical">
          {state.errors.form}
        </p>
      ) : null}

      <div className="mt-4 grid gap-5 sm:grid-cols-2">
        <Field name="name" label="Name" required error={state.errors.name}>
          {(control) => (
            <Input
              {...control}
              defaultValue={state.values.name ?? ""}
              placeholder="Door hardware"
            />
          )}
        </Field>

        <Field
          name="parentId"
          label="Sits inside"
          error={state.errors.parentId}
          hint="Leave as a top level category to have it appear in the main menu."
        >
          {(control) => (
            <Select {...control} defaultValue={state.values.parentId ?? ""}>
              <option value="">A top level category</option>
              {parents.map((parent) => (
                <option key={parent.id} value={parent.id}>
                  {parent.name}
                </option>
              ))}
            </Select>
          )}
        </Field>
      </div>

      <div className="mt-5">
        <Field
          name="description"
          label="Description"
          error={state.errors.description}
        >
          {(control) => (
            <Textarea
              {...control}
              rows={2}
              defaultValue={state.values.description ?? ""}
            />
          )}
        </Field>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-5">
        <label
          htmlFor="isFeatured"
          className="flex cursor-pointer items-center gap-2"
        >
          <input
            id="isFeatured"
            name="isFeatured"
            type="checkbox"
            className="size-4 accent-[var(--color-ink)]"
          />
          <span className="text-[0.9375rem] text-ink">
            Show it on the home page
          </span>
        </label>

        <label
          htmlFor="isHidden"
          className="flex cursor-pointer items-center gap-2"
        >
          <input
            id="isHidden"
            name="isHidden"
            type="checkbox"
            className="size-4 accent-[var(--color-ink)]"
          />
          <span className="text-[0.9375rem] text-ink">
            Keep it hidden for now
          </span>
        </label>
      </div>

      <div className="mt-6">
        <Button type="submit" disabled={pending}>
          {pending ? "Saving" : "Create the category"}
        </Button>
      </div>
    </form>
  );
}
