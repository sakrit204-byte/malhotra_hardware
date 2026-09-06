import type { Metadata } from "next";
import Link from "next/link";
import { TriangleAlert } from "lucide-react";

import { ResendVerificationForm } from "@/components/auth/auth-forms";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "That link did not work",
  robots: { index: false, follow: false, nocache: true },
};

/**
 * Shown when a confirmation link cannot be used.
 *
 * It gives one reason for every case, because telling somebody whether a link
 * was expired, already used or never real would say more about the account
 * than a stranger holding the link should learn.
 */
export default function VerificationProblemPage() {
  return (
    <>
      <div className="flex size-11 items-center justify-center rounded-full bg-caution-wash">
        <TriangleAlert className="size-5 text-caution" aria-hidden="true" />
      </div>

      <h1 className="mt-6 text-3xl">That link did not work</h1>
      <p className="mt-3 text-[0.9375rem] leading-relaxed text-ink-soft">
        Confirmation links last 24 hours and work once. This one may have expired, may
        already have been used, or may have been copied incompletely from the email.
      </p>

      <div className="mt-8 rounded-lg border border-line bg-surface-raised p-5">
        <h2 className="text-base font-medium text-ink">Send another link</h2>
        <p className="mt-2 text-[0.8125rem] leading-relaxed text-ink-soft">
          Give us the address you registered with and we will send a fresh one.
        </p>
        <ResendVerificationForm className="mt-4" />
      </div>

      <div className="mt-8 flex flex-wrap gap-3">
        <Button asChild variant="secondary">
          <Link href="/login">Go to sign in</Link>
        </Button>
        <Button asChild variant="quiet">
          <Link href="/contact">Contact us</Link>
        </Button>
      </div>
    </>
  );
}
