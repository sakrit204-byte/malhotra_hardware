import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Check } from "lucide-react";

import { ResendVerificationForm } from "@/components/auth/auth-forms";
import { Button } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";
import { Container } from "@/components/ui/container";
import { EmptyState } from "@/components/ui/states";
import { formatInquiryDate, statusLabel, statusTone } from "@/lib/inquiry-status";
import { requireUser } from "@/server/auth/guards";
import { listInquiriesForUser } from "@/server/repositories/inquiry";

export const metadata: Metadata = {
  title: "My inquiries",
  robots: { index: false, follow: false },
};

export default async function MyInquiriesPage({
  searchParams,
}: PageProps<"/account/inquiries">) {
  const session = await requireUser("/account/inquiries");
  const params = await searchParams;
  const inquiries = await listInquiriesForUser(session.id);

  return (
    <Container width="default" className="py-10 lg:py-14">
      {params.passwordChanged ? (
        <div
          role="status"
          className="mb-8 flex gap-3 rounded-md border border-positive/25 bg-positive-wash px-4 py-3 text-sm text-ink-soft"
        >
          <Check className="mt-0.5 size-4 shrink-0 text-positive" aria-hidden="true" />
          <p>Your new password is saved. You have been signed out everywhere else.</p>
        </div>
      ) : null}

      {!session.emailVerified ? (
        <div className="mb-8 rounded-lg border border-caution/30 bg-caution-wash p-5">
          <h2 className="text-base font-medium text-ink">Confirm your email address</h2>
          <p className="mt-2 max-w-2xl text-[0.8125rem] leading-relaxed text-ink-soft">
            Your account works, but until this address is confirmed we cannot attach
            inquiries you sent before you registered, and we cannot be sure our replies are
            reaching you.
          </p>
          <ResendVerificationForm defaultEmail={session.email} className="mt-4 max-w-sm" />
        </div>
      ) : null}

      <div className="border-b border-line pb-8">
        <p className="note border-t border-ink pt-3">Your account</p>
        <h1 className="mt-6 text-title text-ink">My inquiries</h1>
        <p className="mt-3 max-w-2xl leading-relaxed text-ink-soft">
          Every inquiry you have sent, with its replies and its summary. Signed in as{" "}
          {session.email}.
        </p>
      </div>

      {inquiries.length === 0 ? (
        <div className="mt-10">
          <EmptyState
            title="No inquiries yet"
            description="When you send an inquiry it appears here, with every reply from our team and a summary you can download."
            action={
              <Button asChild>
                <Link href="/products">Browse the catalogue</Link>
              </Button>
            }
          />
        </div>
      ) : (
        <ul className="mt-8 divide-y divide-line border-y border-line">
          {inquiries.map((inquiry) => (
            <li key={inquiry.id}>
              <Link
                href={`/account/inquiries/${inquiry.id}`}
                className="flex flex-wrap items-center gap-4 px-2 py-5 transition-colors hover:bg-surface-sunken sm:flex-nowrap"
              >
                <div className="flex shrink-0 gap-2">
                  {inquiry.items.slice(0, 3).map((item) =>
                    item.imageUrl ? (
                      <div
                        key={item.id}
                        className="relative size-12 overflow-hidden rounded-md border border-line bg-surface-sunken"
                      >
                        <Image
                          src={item.imageUrl}
                          alt=""
                          fill
                          sizes="3rem"
                          className="object-cover"
                        />
                      </div>
                    ) : null,
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <p className="font-display text-lg tracking-wide text-ink">
                    {inquiry.reference}
                  </p>
                  <p className="mt-0.5 text-[0.8125rem] text-ink-muted">
                    {formatInquiryDate(inquiry.createdAt)}
                    {inquiry.projectName ? `, ${inquiry.projectName}` : ""},{" "}
                    {inquiry.itemCount}{" "}
                    {inquiry.itemCount === 1 ? "product" : "products"}
                  </p>
                </div>

                <div className="flex shrink-0 items-center gap-3">
                  {inquiry.unreadForCustomer ? <Chip tone="brick">New reply</Chip> : null}
                  <Chip tone={statusTone(inquiry.status)}>
                    {statusLabel(inquiry.status)}
                  </Chip>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </Container>
  );
}
