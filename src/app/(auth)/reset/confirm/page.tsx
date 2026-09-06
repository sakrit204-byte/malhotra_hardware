import type { Metadata } from "next";
import Link from "next/link";
import { TriangleAlert } from "lucide-react";

import { CompleteResetForm } from "@/components/auth/auth-forms";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Choose a new password",
  robots: { index: false, follow: false, nocache: true },
};

/**
 * The form behind a password reset link.
 *
 * The token is only checked when the new password is submitted, never on the
 * way in. Checking it here would let somebody hold a valid link open in a tab
 * and would consume it without any password being set.
 */
export default async function ConfirmResetPage({
  searchParams,
}: PageProps<"/reset/confirm">) {
  const params = await searchParams;
  const token = typeof params.token === "string" ? params.token : "";

  if (!token) {
    return (
      <>
        <div className="flex size-11 items-center justify-center rounded-full bg-caution-wash">
          <TriangleAlert className="size-5 text-caution" aria-hidden="true" />
        </div>
        <h1 className="mt-6 text-3xl">This link is incomplete</h1>
        <p className="mt-3 text-[0.9375rem] leading-relaxed text-ink-soft">
          Copy the whole address from the email, or ask us for a fresh link.
        </p>
        <div className="mt-8">
          <Button asChild>
            <Link href="/reset">Ask for a new link</Link>
          </Button>
        </div>
      </>
    );
  }

  return (
    <>
      <h1 className="text-3xl">Choose a new password</h1>
      <p className="mt-3 text-[0.9375rem] leading-relaxed text-ink-soft">
        Pick something you can remember. At least ten characters, and a short phrase works
        better than a single word.
      </p>

      <div className="mt-8">
        <CompleteResetForm token={token} />
      </div>
    </>
  );
}
