import type { Metadata } from "next";
import Link from "next/link";
import { MailCheck } from "lucide-react";

import { ResendVerificationForm } from "@/components/auth/auth-forms";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Confirm your email address",
  robots: { index: false, follow: false },
};

/**
 * Shown after registering.
 *
 * It says the same thing whether the address was new or already had an account,
 * because the page itself must not reveal which. The email that arrives says
 * the rest.
 */
export default async function RegistrationSentPage({
  searchParams,
}: PageProps<"/register/sent">) {
  const params = await searchParams;
  const email = typeof params.email === "string" ? params.email : "";

  return (
    <>
      <div className="flex size-11 items-center justify-center rounded-full bg-brick-wash">
        <MailCheck className="size-5 text-brick-strong" aria-hidden="true" />
      </div>

      <h1 className="mt-6 text-3xl">Check your email</h1>
      <p className="mt-3 text-[0.9375rem] leading-relaxed text-ink-soft">
        {email ? (
          <>
            We have sent a confirmation link to{" "}
            <span className="text-ink">{email}</span>. Open it and your account is ready.
          </>
        ) : (
          "We have sent you a confirmation link. Open it and your account is ready."
        )}{" "}
        The link works for 24 hours.
      </p>

      <div className="mt-8 rounded-lg border border-line bg-surface-raised p-5">
        <h2 className="text-base font-medium text-ink">Nothing arrived</h2>
        <p className="mt-2 text-[0.8125rem] leading-relaxed text-ink-soft">
          Look in your spam folder first. If it is not there, we can send another.
        </p>
        <ResendVerificationForm defaultEmail={email} className="mt-4" />
      </div>

      <div className="mt-8 flex flex-wrap gap-3">
        <Button asChild variant="secondary">
          <Link href="/login">Go to sign in</Link>
        </Button>
        <Button asChild variant="quiet">
          <Link href="/products">Keep browsing</Link>
        </Button>
      </div>
    </>
  );
}
