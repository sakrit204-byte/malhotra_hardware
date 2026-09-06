"use client";

import { useActionState, useState } from "react";
import { Plus, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Field, Input, Select } from "@/components/ui/field";
import { emptyAuthState } from "@/lib/auth-form";
import { inviteStaffAction } from "@/server/actions/admin-people";

/**
 * Adding a colleague.
 *
 * No password field, deliberately. The account is created without a usable one
 * and the person sets their own from an emailed link, so a password is never
 * typed by one person on behalf of another.
 */
export function InviteForm() {
  const [state, action, pending] = useActionState(
    inviteStaffAction,
    emptyAuthState,
  );
  const [open, setOpen] = useState(false);

  const [lastStatus, setLastStatus] = useState(state.status);
  if (state.status !== lastStatus) {
    setLastStatus(state.status);
    if (state.status === "sent" && open) setOpen(false);
  }

  if (!open) {
    return (
      <div className="flex flex-wrap items-center gap-3">
        <Button onClick={() => setOpen(true)}>
          <Plus className="size-4" aria-hidden="true" />
          Add a colleague
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
          <h2 className="text-lg text-ink">A new colleague</h2>
          <p className="mt-1 max-w-lg text-[0.875rem] text-ink-muted">
            They are emailed a link to set their own password. Nobody chooses a
            password on somebody else&rsquo;s behalf.
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
        <Field
          name="fullName"
          label="Full name"
          required
          error={state.errors.fullName}
        >
          {(control) => (
            <Input
              {...control}
              autoComplete="name"
              defaultValue={state.values.fullName ?? ""}
            />
          )}
        </Field>

        <Field
          name="email"
          label="Email address"
          required
          error={state.errors.email}
        >
          {(control) => (
            <Input
              {...control}
              type="email"
              autoComplete="email"
              defaultValue={state.values.email ?? ""}
            />
          )}
        </Field>

        <Field name="phone" label="Phone" error={state.errors.phone}>
          {(control) => (
            <Input
              {...control}
              type="tel"
              autoComplete="tel"
              defaultValue={state.values.phone ?? ""}
            />
          )}
        </Field>

        <Field
          name="role"
          label="Role"
          required
          error={state.errors.role}
          hint="A manager answers inquiries. An administrator also edits the catalogue and the people here."
        >
          {(control) => (
            <Select {...control} defaultValue={state.values.role || "MANAGER"}>
              <option value="MANAGER">Manager</option>
              <option value="ADMIN">Administrator</option>
            </Select>
          )}
        </Field>
      </div>

      <div className="mt-6">
        <Button type="submit" disabled={pending}>
          {pending ? "Sending" : "Add them and send the link"}
        </Button>
      </div>
    </form>
  );
}
