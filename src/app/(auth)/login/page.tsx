import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { LoginForm } from "@/components/auth/auth-forms";
import { getSession } from "@/server/auth/session";
import { safeRedirect } from "@/server/validation/auth";

export const metadata: Metadata = {
  title: "Sign in",
  description: "Sign in to see your inquiries with Malhotra Enterprise.",
  robots: { index: false, follow: false },
};

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const params = await searchParams;
  const next = safeRedirect(typeof params.next === "string" ? params.next : null);

  // Somebody already signed in has no business on this page.
  if (await getSession()) {
    redirect(next);
  }

  return (
    <>
      <h1 className="text-3xl">Sign in</h1>
      <p className="mt-3 text-[0.9375rem] leading-relaxed text-ink-soft">
        Your inquiries, their replies and every summary in one place. You do not need an
        account to send an inquiry.
      </p>

      <div className="mt-8">
        <LoginForm next={next} />
      </div>
    </>
  );
}
