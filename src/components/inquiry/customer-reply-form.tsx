"use client";

import { useActionState, useEffect, useRef } from "react";
import { Check, Send } from "lucide-react";

import { Button } from "@/components/ui/button";
import { emptyAuthState } from "@/lib/auth-form";
import { replyAsCustomerAction } from "@/server/actions/conversation";

/**
 * Where a customer answers the team.
 *
 * A guest reaches this through the signed link they were emailed, so the token
 * travels with the message and is checked again on the server. The page having
 * rendered the form is not treated as proof of anything.
 */
export function CustomerReplyForm({
  inquiryId,
  token,
}: {
  inquiryId: string;
  /** Present when a guest is reading through their emailed link. */
  token?: string;
}) {
  const [state, action, pending] = useActionState(replyAsCustomerAction, emptyAuthState);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.status === "sent") formRef.current?.reset();
  }, [state]);

  return (
    <form
      ref={formRef}
      action={action}
      className="rounded-lg border border-line bg-surface-raised p-4"
    >
      <input type="hidden" name="inquiryId" value={inquiryId} />
      {token ? <input type="hidden" name="token" value={token} /> : null}

      {state.status === "sent" && state.message ? (
        <p
          role="status"
          className="mb-3 flex items-start gap-2 text-[0.875rem] text-positive"
        >
          <Check className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          {state.message}
        </p>
      ) : null}

      {state.errors.form || state.errors.body ? (
        <p role="alert" className="mb-3 text-[0.875rem] text-critical">
          {state.errors.form ?? state.errors.body}
        </p>
      ) : null}

      <label htmlFor="reply-body" className="block text-[0.875rem] font-medium text-ink">
        Reply to our team
      </label>
      <textarea
        id="reply-body"
        name="body"
        rows={4}
        maxLength={4000}
        required
        defaultValue={state.values.body ?? ""}
        placeholder="Ask a question, confirm quantities, or tell us how you would like to proceed."
        className="mt-2 w-full rounded-md border border-line-strong bg-surface-raised px-3 py-2.5 leading-relaxed hover:border-ink-muted"
      />

      <div className="mt-3 flex items-center justify-between gap-3">
        <p className="text-[0.8125rem] text-ink-muted">
          We answer by email, usually within one working day.
        </p>
        <Button type="submit" disabled={pending}>
          <Send className="size-4" aria-hidden="true" />
          {pending ? "Sending" : "Send"}
        </Button>
      </div>
    </form>
  );
}
