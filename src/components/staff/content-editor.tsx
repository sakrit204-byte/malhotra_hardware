"use client";

import { useActionState } from "react";

import { Button } from "@/components/ui/button";
import { emptyAuthState } from "@/lib/auth-form";
import { saveSiteContentAction } from "@/server/actions/admin-content";

/**
 * One block of site content.
 *
 * Content is stored as structured data rather than as prose, so it is edited as
 * structured data. A malformed edit is refused with the reason before it is
 * saved, which is what stops a stray comma from taking the home page down.
 */
export function ContentEditor({
  contentKey,
  description,
  value,
}: {
  contentKey: string;
  description: string | null;
  value: string;
}) {
  const [state, action, pending] = useActionState(saveSiteContentAction, emptyAuthState);
  const rows = Math.min(24, Math.max(6, value.split("\n").length + 1));

  return (
    <form action={action} className="rounded-lg border border-line bg-surface-raised p-5">
      <input type="hidden" name="key" value={contentKey} />

      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <h2 className="font-mono text-[0.9375rem] text-ink">{contentKey}</h2>
        {description ? (
          <p className="text-[0.875rem] text-ink-muted">{description}</p>
        ) : null}
      </div>

      <label htmlFor={`content-${contentKey}`} className="sr-only">
        Content for {contentKey}
      </label>
      <textarea
        id={`content-${contentKey}`}
        name="value"
        rows={rows}
        defaultValue={state.values.value ?? value}
        spellCheck={false}
        aria-invalid={state.errors.value ? true : undefined}
        className="mt-3 w-full resize-y rounded-md border border-line-strong bg-surface px-3 py-2.5 font-mono text-[0.8125rem] leading-relaxed text-ink aria-[invalid=true]:border-critical"
      />

      {state.errors.value ? (
        <p role="alert" className="mt-2 text-[0.875rem] text-critical">
          {state.errors.value}
        </p>
      ) : null}

      {state.errors.form ? (
        <p role="alert" className="mt-2 text-[0.875rem] text-critical">
          {state.errors.form}
        </p>
      ) : null}

      <div className="mt-4 flex items-center gap-3">
        <Button type="submit" variant="secondary" disabled={pending}>
          {pending ? "Saving" : "Save"}
        </Button>

        {state.status === "sent" && state.message ? (
          <p role="status" className="text-[0.875rem] text-positive">
            {state.message}
          </p>
        ) : null}
      </div>
    </form>
  );
}
