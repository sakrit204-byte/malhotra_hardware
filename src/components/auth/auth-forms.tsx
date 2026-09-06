"use client";

import Link from "next/link";
import { useActionState, useEffect, useRef, useState } from "react";
import { Check, Eye, EyeOff } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { emptyAuthState, type AuthFormState } from "@/lib/auth-form";
import { cn } from "@/lib/cn";
import {
  completeResetAction,
  loginAction,
  registerAction,
  requestResetAction,
  resendVerificationAction,
} from "@/server/actions/auth";

/**
 * The account forms.
 *
 * They share one shape: a summary of anything wrong at the top which takes
 * focus, a message against each field it belongs to, and values kept so a
 * rejected form never loses what somebody typed. Passwords are the exception
 * and are never returned, because putting a password back into a page means
 * having sent it back out again.
 */

function FormMessage({ state }: { state: AuthFormState }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (state.status === "error" && state.errors.form) ref.current?.focus();
  }, [state]);

  if (state.status === "sent" && state.message) {
    return (
      <div
        role="status"
        className="flex gap-3 rounded-md border border-positive/25 bg-positive-wash px-4 py-3 text-sm text-ink-soft"
      >
        <Check className="mt-0.5 size-4 shrink-0 text-positive" aria-hidden="true" />
        <p>{state.message}</p>
      </div>
    );
  }

  if (state.errors.form) {
    return (
      <div
        ref={ref}
        role="alert"
        tabIndex={-1}
        className="rounded-md border border-critical/30 bg-critical-wash px-4 py-3 text-sm text-critical"
      >
        {state.errors.form}
      </div>
    );
  }

  return null;
}

/** A password field with a control to reveal what has been typed. */
function PasswordField({
  name,
  label,
  error,
  hint,
  autoComplete,
}: {
  name: string;
  label: string;
  error?: string;
  hint?: string;
  autoComplete: string;
}) {
  const [visible, setVisible] = useState(false);

  return (
    <Field name={name} label={label} required error={error} hint={hint}>
      {(control) => (
        <div className="relative">
          <Input
            {...control}
            type={visible ? "text" : "password"}
            autoComplete={autoComplete}
            className="pr-11"
          />
          <button
            type="button"
            onClick={() => setVisible((value) => !value)}
            aria-pressed={visible}
            className="absolute right-1 top-1 inline-flex size-8 items-center justify-center rounded-sm text-ink-muted transition-colors hover:text-ink"
          >
            {visible ? (
              <EyeOff className="size-4" aria-hidden="true" />
            ) : (
              <Eye className="size-4" aria-hidden="true" />
            )}
            <span className="sr-only">
              {visible ? "Hide the password" : "Show the password"}
            </span>
          </button>
        </div>
      )}
    </Field>
  );
}

// ------------------------------------------------------------------- login

export function LoginForm({ next }: { next: string }) {
  const [state, action, pending] = useActionState(loginAction, emptyAuthState);

  return (
    <form action={action} noValidate className="space-y-5">
      <input type="hidden" name="next" value={next} />
      <FormMessage state={state} />

      <Field name="email" label="Email address" required error={state.errors.email}>
        {(control) => (
          <Input
            {...control}
            type="email"
            autoComplete="email"
            inputMode="email"
            autoFocus
            defaultValue={state.values.email ?? ""}
          />
        )}
      </Field>

      <PasswordField
        name="password"
        label="Password"
        autoComplete="current-password"
        error={state.errors.password}
      />

      <Button type="submit" size="lg" block disabled={pending}>
        {pending ? "Signing in" : "Sign in"}
      </Button>

      <div className="flex flex-wrap justify-between gap-3 text-[0.8125rem]">
        <Link href="/reset" className="text-ink-soft underline underline-offset-4 hover:text-ink">
          Forgotten your password
        </Link>
        <Link
          href="/register"
          className="text-ink-soft underline underline-offset-4 hover:text-ink"
        >
          Create an account
        </Link>
      </div>
    </form>
  );
}

// ---------------------------------------------------------------- register

export function RegisterForm() {
  const [state, action, pending] = useActionState(registerAction, emptyAuthState);

  return (
    <form action={action} noValidate className="space-y-5">
      <FormMessage state={state} />

      <Field name="fullName" label="Full name" required error={state.errors.fullName}>
        {(control) => (
          <Input
            {...control}
            autoComplete="name"
            autoFocus
            defaultValue={state.values.fullName ?? ""}
          />
        )}
      </Field>

      <Field
        name="email"
        label="Email address"
        required
        error={state.errors.email}
        hint="We send your confirmation here, and every reply to your inquiries."
      >
        {(control) => (
          <Input
            {...control}
            type="email"
            autoComplete="email"
            inputMode="email"
            defaultValue={state.values.email ?? ""}
          />
        )}
      </Field>

      <div className="grid gap-5 sm:grid-cols-2">
        <Field name="phone" label="Phone number" error={state.errors.phone}>
          {(control) => (
            <Input
              {...control}
              type="tel"
              autoComplete="tel"
              placeholder="+977 98 00000000"
              defaultValue={state.values.phone ?? ""}
            />
          )}
        </Field>

        <Field name="companyName" label="Company name" error={state.errors.companyName}>
          {(control) => (
            <Input
              {...control}
              autoComplete="organization"
              defaultValue={state.values.companyName ?? ""}
            />
          )}
        </Field>
      </div>

      <PasswordField
        name="password"
        label="Password"
        autoComplete="new-password"
        error={state.errors.password}
        hint="At least ten characters. A short phrase you can remember works well."
      />

      <Button type="submit" size="lg" block disabled={pending}>
        {pending ? "Creating your account" : "Create account"}
      </Button>

      <p className="text-[0.8125rem] text-ink-muted">
        Already have an account?{" "}
        <Link href="/login" className="text-ink underline underline-offset-4">
          Sign in
        </Link>
      </p>
    </form>
  );
}

// ------------------------------------------------------------ reset request

export function RequestResetForm() {
  const [state, action, pending] = useActionState(requestResetAction, emptyAuthState);

  if (state.status === "sent") {
    return (
      <div className="space-y-5">
        <FormMessage state={state} />
        <Button asChild variant="secondary" block>
          <Link href="/login">Back to sign in</Link>
        </Button>
      </div>
    );
  }

  return (
    <form action={action} noValidate className="space-y-5">
      <FormMessage state={state} />

      <Field
        name="email"
        label="Email address"
        required
        error={state.errors.email}
        hint="The address on your account."
      >
        {(control) => (
          <Input
            {...control}
            type="email"
            autoComplete="email"
            inputMode="email"
            autoFocus
            defaultValue={state.values.email ?? ""}
          />
        )}
      </Field>

      <Button type="submit" size="lg" block disabled={pending}>
        {pending ? "Sending" : "Send me a link"}
      </Button>

      <p className="text-[0.8125rem] text-ink-muted">
        <Link href="/login" className="text-ink underline underline-offset-4">
          Back to sign in
        </Link>
      </p>
    </form>
  );
}

// ------------------------------------------------------------- reset finish

export function CompleteResetForm({ token }: { token: string }) {
  const [state, action, pending] = useActionState(completeResetAction, emptyAuthState);

  return (
    <form action={action} noValidate className="space-y-5">
      <input type="hidden" name="token" value={token} />
      <FormMessage state={state} />

      <PasswordField
        name="password"
        label="New password"
        autoComplete="new-password"
        error={state.errors.password}
        hint="At least ten characters."
      />

      <PasswordField
        name="confirmPassword"
        label="Type it again"
        autoComplete="new-password"
        error={state.errors.confirmPassword}
      />

      <Button type="submit" size="lg" block disabled={pending}>
        {pending ? "Saving" : "Save my new password"}
      </Button>

      <p className="text-[0.8125rem] text-ink-muted">
        Saving a new password signs you out everywhere else.
      </p>
    </form>
  );
}

// ----------------------------------------------------- resend confirmation

export function ResendVerificationForm({
  defaultEmail = "",
  className,
}: {
  defaultEmail?: string;
  className?: string;
}) {
  const [state, action, pending] = useActionState(
    resendVerificationAction,
    emptyAuthState,
  );

  return (
    <form action={action} noValidate className={cn("space-y-4", className)}>
      <FormMessage state={state} />

      {state.status !== "sent" ? (
        <>
          <Field name="email" label="Email address" required error={state.errors.email}>
            {(control) => (
              <Input
                {...control}
                type="email"
                autoComplete="email"
                inputMode="email"
                defaultValue={state.values.email ?? defaultEmail}
              />
            )}
          </Field>

          <Button type="submit" variant="secondary" disabled={pending}>
            {pending ? "Sending" : "Send another link"}
          </Button>
        </>
      ) : null}
    </form>
  );
}
