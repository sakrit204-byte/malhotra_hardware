"use client";

import { Paperclip } from "lucide-react";
import { useActionState, useEffect, useRef } from "react";

import { Button } from "@/components/ui/button";
import { Field, FormErrorSummary, Input, Textarea } from "@/components/ui/field";
import { acceptAttribute, acceptedDescription, MAX_FILES } from "@/lib/attachments";
import {
  emptyInquiryFormState,
  type InquiryFormState,
} from "@/lib/inquiry-form";
import { submitInquiry } from "@/server/actions/inquiry-submit";

/**
 * The inquiry form.
 *
 * A signed in customer has their account address filled in and locked, because
 * the inquiry is bound to their account and the two must not disagree. A guest
 * types their own details and needs no account at any point.
 *
 * When the server rejects the submission the customer keeps everything they
 * typed, focus moves to the summary of what went wrong, and each message sits
 * against the field it belongs to.
 */
export function InquiryForm({
  account,
  itemCount,
}: {
  account: { email: string; fullName: string } | null;
  itemCount: number;
}) {
  const [state, formAction, pending] = useActionState<InquiryFormState, FormData>(
    submitInquiry,
    emptyInquiryFormState,
  );
  const summaryRef = useRef<HTMLDivElement>(null);

  // Move the reader to the problem rather than leaving them to hunt for it.
  useEffect(() => {
    if (state.status === "error") summaryRef.current?.focus();
  }, [state]);

  const value = (field: string, fallback = "") => state.values[field] ?? fallback;

  const messages = Object.entries(state.errors)
    .filter(([field]) => field !== "form")
    .map(([, message]) => message)
    .filter((message): message is string => Boolean(message));

  return (
    // React sets the encoding for a form whose action is a server action, so
    // the form must not specify one itself.
    <form action={formAction} noValidate className="space-y-8">
      {state.errors.form ? (
        <div
          ref={summaryRef}
          role="alert"
          tabIndex={-1}
          className="rounded-md border border-critical/30 bg-critical-wash px-4 py-3 text-sm text-critical"
        >
          {state.errors.form}
        </div>
      ) : messages.length > 0 ? (
        <div ref={summaryRef} tabIndex={-1}>
          <FormErrorSummary
            title="Check these before sending your inquiry"
            errors={messages}
          />
        </div>
      ) : null}

      <fieldset className="space-y-5">
        <legend className="text-lg text-ink">Your details</legend>

        <div className="grid gap-5 sm:grid-cols-2">
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
                defaultValue={value("fullName", account?.fullName ?? "")}
              />
            )}
          </Field>

          <Field
            name="email"
            label="Email address"
            required
            error={state.errors.email}
            hint={
              account
                ? "Your replies go to the address on your account."
                : "Your reference number and our reply are sent here."
            }
          >
            {(control) =>
              account ? (
                <>
                  <Input
                    {...control}
                    type="email"
                    value={account.email}
                    readOnly
                    className="bg-surface-sunken text-ink-soft"
                  />
                  <input type="hidden" name="email" value={account.email} />
                </>
              ) : (
                <Input
                  {...control}
                  type="email"
                  autoComplete="email"
                  inputMode="email"
                  defaultValue={value("email")}
                />
              )
            }
          </Field>

          <Field name="phone" label="Phone number" required error={state.errors.phone}>
            {(control) => (
              <Input
                {...control}
                type="tel"
                autoComplete="tel"
                inputMode="tel"
                placeholder="+977 98 00000000"
                defaultValue={value("phone")}
              />
            )}
          </Field>

          <Field name="companyName" label="Company name" error={state.errors.companyName}>
            {(control) => (
              <Input
                {...control}
                autoComplete="organization"
                defaultValue={value("companyName")}
              />
            )}
          </Field>
        </div>
      </fieldset>

      <fieldset className="space-y-5">
        <legend className="text-lg text-ink">About the project</legend>
        <p className="text-[0.8125rem] text-ink-muted">
          Optional, but it helps us answer properly the first time.
        </p>

        <div className="grid gap-5 sm:grid-cols-2">
          <Field name="projectName" label="Project name" error={state.errors.projectName}>
            {(control) => <Input {...control} defaultValue={value("projectName")} />}
          </Field>

          <Field
            name="projectLocation"
            label="Project location"
            error={state.errors.projectLocation}
          >
            {(control) => (
              <Input
                {...control}
                placeholder="Bhaisepati, Lalitpur"
                defaultValue={value("projectLocation")}
              />
            )}
          </Field>
        </div>

        <Field
          name="message"
          label="Message"
          required
          error={state.errors.message}
          hint="Quantities, timing, and anything the products need to suit."
        >
          {(control) => (
            <Textarea
              {...control}
              rows={5}
              defaultValue={value("message")}
              placeholder="Tell us about the project, the quantities you need and when you need them."
            />
          )}
        </Field>

        <Field
          name="additionalRequirements"
          label="Additional requirements"
          error={state.errors.additionalRequirements}
        >
          {(control) => (
            <Textarea {...control} rows={3} defaultValue={value("additionalRequirements")} />
          )}
        </Field>
      </fieldset>

      <fieldset className="space-y-3">
        <legend className="text-lg text-ink">Reference files</legend>
        <p className="text-[0.8125rem] text-ink-muted">
          Drawings, a door schedule, or a photograph of hardware you need to match. Up to{" "}
          {MAX_FILES} files. {acceptedDescription}.
        </p>

        <label
          htmlFor="attachments"
          className="flex cursor-pointer items-center gap-3 rounded-md border border-dashed border-line-strong bg-surface-raised px-4 py-4 text-sm text-ink-soft transition-colors hover:border-ink-muted hover:text-ink"
        >
          <Paperclip className="size-4 shrink-0" aria-hidden="true" />
          Choose files to attach
        </label>
        <input
          id="attachments"
          name="attachments"
          type="file"
          multiple
          accept={acceptAttribute}
          className="sr-only"
          aria-describedby={state.errors.attachments ? "attachments-error" : undefined}
        />

        {state.errors.attachments ? (
          <p id="attachments-error" className="text-[0.8125rem] text-critical">
            {state.errors.attachments}
          </p>
        ) : null}
      </fieldset>

      <div className="border-t border-line pt-6">
        <Button type="submit" size="lg" disabled={pending || itemCount === 0}>
          {pending ? "Sending your inquiry" : "Submit Inquiry"}
        </Button>
        <p className="mt-3 text-[0.8125rem] text-ink-muted">
          You will get a reference number straight away and a summary by email. No account
          is needed.
        </p>
      </div>
    </form>
  );
}
