import type { Metadata } from "next";

import { RequestResetForm } from "@/components/auth/auth-forms";

export const metadata: Metadata = {
  title: "Set a new password",
  robots: { index: false, follow: false },
};

export default function RequestResetPage() {
  return (
    <>
      <h1 className="text-[2rem] leading-[1.1]">Forgotten your password</h1>
      <p className="mt-3 text-[0.9375rem] leading-relaxed text-ink-soft">
        Give us the address on your account and we will send a link to set a new password.
        The link works once and lasts an hour.
      </p>

      <div className="mt-8">
        <RequestResetForm />
      </div>
    </>
  );
}
