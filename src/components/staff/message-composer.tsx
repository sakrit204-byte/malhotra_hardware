"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { Check, Lock, Send } from "lucide-react";

import { Button } from "@/components/ui/button";
import { emptyAuthState } from "@/lib/auth-form";
import { cn } from "@/lib/cn";
import { sendManagerMessageAction } from "@/server/actions/manager";

/**
 * Where a manager writes into the thread.
 *
 * Two modes on one control, because they are the same act with a different
 * audience and separating them into two boxes invites writing in the wrong one.
 * The mode is stated in words above the field and again on the button, and the
 * whole composer changes colour when a note is being written, so it is very
 * hard to send an internal note to a customer by accident.
 */
export function MessageComposer({
  inquiryId,
  customerName,
}: {
  inquiryId: string;
  customerName: string;
}) {
  const [state, action, pending] = useActionState(
    sendManagerMessageAction,
    emptyAuthState,
  );
  const formRef = useRef<HTMLFormElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [isNote, setIsNote] = useState(false);

  // The composer drops back to writing to the customer once a note is away, so
  // the next message is never a note by inheritance. Deriving it from the
  // change in status keeps it out of an effect, where it would cost a second
  // render every time.
  const [settled, setSettled] = useState(state);
  if (state !== settled) {
    setSettled(state);
    if (state.status === "sent") setIsNote(false);
  }

  // Clearing the box and putting the cursor back are changes to the DOM, so
  // they stay in an effect.
  useEffect(() => {
    if (state.status !== "sent") return;

    formRef.current?.reset();
    textareaRef.current?.focus();
  }, [state]);

  return (
    <form
      ref={formRef}
      action={action}
      className={cn(
        "rounded-lg border p-4 transition-colors",
        isNote
          ? "border-caution/40 bg-caution-wash"
          : "border-line bg-surface-raised",
      )}
    >
      <input type="hidden" name="inquiryId" value={inquiryId} />

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

      <label htmlFor="message-body" className="block text-[0.875rem] text-ink-soft">
        {isNote
          ? "Writing a note for the team. The customer never sees this and no email is sent."
          : `Writing to ${customerName}. This is emailed to them as soon as you send it.`}
      </label>

      <textarea
        ref={textareaRef}
        id="message-body"
        name="body"
        rows={5}
        maxLength={6000}
        required
        defaultValue={state.values.body ?? ""}
        placeholder="Confirm availability, lead time and price, and say what happens next."
        className="mt-2 w-full rounded-md border border-line-strong bg-surface-raised px-3 py-2.5 leading-relaxed hover:border-ink-muted"
      />

      <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
        <label
          htmlFor="internal-note"
          className="flex cursor-pointer items-center gap-2.5 text-[0.875rem] text-ink-soft"
        >
          <input
            id="internal-note"
            name="isInternalNote"
            type="checkbox"
            checked={isNote}
            onChange={(event) => setIsNote(event.target.checked)}
            className="size-4 accent-[var(--color-ink)]"
          />
          <Lock className="size-3.5" aria-hidden="true" />
          Internal note, not sent to the customer
        </label>

        <Button type="submit" disabled={pending}>
          {isNote ? (
            <Lock className="size-4" aria-hidden="true" />
          ) : (
            <Send className="size-4" aria-hidden="true" />
          )}
          {pending ? "Saving" : isNote ? "Save note" : "Send to customer"}
        </Button>
      </div>
    </form>
  );
}
