import type { Metadata } from "next";
import Link from "next/link";
import { Check } from "lucide-react";

import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Your account is ready",
  robots: { index: false, follow: false, nocache: true },
};

/**
 * Shown after the confirmation link has done its work.
 *
 * The handler at /verify has already confirmed the address, attached any guest
 * inquiries and signed the customer in, so this page only reports what
 * happened.
 */
export default async function VerifiedPage({ searchParams }: PageProps<"/verify/done">) {
  const params = await searchParams;

  const claimed = Number(
    typeof params.claimed === "string" ? params.claimed : 0,
  );
  const alreadyVerified = params.already === "1";

  return (
    <>
      <div className="flex size-11 items-center justify-center rounded-full bg-positive-wash">
        <Check className="size-5 text-positive" aria-hidden="true" />
      </div>

      <h1 className="mt-6 text-3xl">
        {alreadyVerified ? "You are signed in" : "Your account is ready"}
      </h1>

      <p className="mt-3 text-[0.9375rem] leading-relaxed text-ink-soft">
        {alreadyVerified
          ? "This address was already confirmed, so we have simply signed you in."
          : "Your email address is confirmed and you are signed in."}
        {claimed > 0
          ? ` We have also attached ${claimed} ${
              claimed === 1 ? "inquiry" : "inquiries"
            } you sent from this address before you had an account.`
          : ""}
      </p>

      <div className="mt-8 flex flex-wrap gap-3">
        <Button asChild size="lg">
          <Link href="/account/inquiries">Go to my inquiries</Link>
        </Button>
        <Button asChild size="lg" variant="secondary">
          <Link href="/products">Browse the catalogue</Link>
        </Button>
      </div>
    </>
  );
}
