import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { RegisterForm } from "@/components/auth/auth-forms";
import { getSession } from "@/server/auth/session";

export const metadata: Metadata = {
  title: "Create an account",
  description:
    "Create an account with Malhotra Enterprise to keep every inquiry and reply in one place.",
  robots: { index: false, follow: false },
};

export default async function RegisterPage() {
  if (await getSession()) {
    redirect("/account/inquiries");
  }

  return (
    <>
      <h1 className="text-3xl">Create an account</h1>
      <p className="mt-3 text-[0.9375rem] leading-relaxed text-ink-soft">
        An account keeps your inquiries, replies and summaries together. Anything you have
        already sent from the same address joins them once you confirm it.
      </p>

      <div className="mt-8">
        <RegisterForm />
      </div>
    </>
  );
}
