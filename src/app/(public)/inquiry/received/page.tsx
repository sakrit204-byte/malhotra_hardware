import type { Metadata } from "next";
import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { Check, Download } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Container } from "@/components/ui/container";
import { RECEIPT_COOKIE } from "@/server/inquiry/receipt";
import { getSession } from "@/server/auth/session";
import { prisma } from "@/server/db/prisma";

export const metadata: Metadata = {
  title: "Inquiry received",
  robots: { index: false, follow: false },
};

/**
 * Confirmation page.
 *
 * The inquiry is identified by a short lived cookie set when it was created,
 * rather than by an identifier in the address. That means the reference never
 * appears in a URL that could be shared, copied into a chat or written to a
 * proxy log, and refreshing the page keeps working for the next hour.
 */
export default async function InquiryReceivedPage() {
  const store = await cookies();
  const inquiryId = store.get(RECEIPT_COOKIE)?.value;

  if (!inquiryId) {
    redirect("/inquiry");
  }

  const [session, inquiry] = await Promise.all([
    getSession(),
    prisma.inquiry.findUnique({
      where: { id: inquiryId },
      select: {
        id: true,
        reference: true,
        email: true,
        fullName: true,
        itemCount: true,
        summaryPath: true,
        userId: true,
        createdAt: true,
        items: {
          orderBy: { sortOrder: "asc" },
          select: {
            id: true,
            productName: true,
            productCode: true,
            variantLabel: true,
            quantity: true,
          },
        },
      },
    }),
  ]);

  // The cookie outlived the record, or points at something that is not there.
  if (!inquiry) {
    redirect("/inquiry");
  }

  return (
    <Container width="narrow" className="py-14 lg:py-20">
      <div className="flex size-11 items-center justify-center rounded-full bg-positive-wash">
        <Check className="size-5 text-positive" aria-hidden="true" />
      </div>

      <h1 className="mt-6 text-title text-ink">Your inquiry is with our team</h1>
      <p className="mt-4 leading-relaxed text-ink-soft">
        Thank you, {inquiry.fullName.split(" ")[0]}. We have sent a confirmation and a
        summary to {inquiry.email}. Quote the reference below if you call or write to us
        about this project.
      </p>

      <div className="mt-8 border border-line bg-surface-raised px-5 py-4">
        <p className="note border-t border-ink pt-3">Inquiry reference</p>
        <p className="mt-1 font-display text-2xl tracking-wide text-ink">
          {inquiry.reference}
        </p>
      </div>

      <section className="mt-10" aria-labelledby="requested">
        <h2 id="requested" className="note border-t border-ink pt-3">
          Requested products
        </h2>
        <ul className="mt-3 divide-y divide-line border-y border-line">
          {inquiry.items.map((item) => (
            <li key={item.id} className="flex items-baseline justify-between gap-4 py-3">
              <div>
                <p className="text-sm text-ink">{item.productName}</p>
                <p className="mt-0.5 font-mono text-[0.75rem] text-ink-muted">
                  {item.productCode}
                  {item.variantLabel ? `, ${item.variantLabel}` : ""}
                </p>
              </div>
              <p className="shrink-0 text-sm tabular-nums text-ink-soft">
                {item.quantity}
              </p>
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-10" aria-labelledby="next">
        <h2 id="next" className="note border-t border-ink pt-3">
          What happens next
        </h2>
        <p className="mt-3 leading-relaxed text-ink-soft">
          A member of our team will confirm availability, lead times and pricing, usually
          within one working day. Their reply arrives by email and you can answer it
          directly. {session ? "You can also follow it in your account." : "The email includes a private link that opens this inquiry and its conversation."}
        </p>
      </section>

      <div className="mt-10 flex flex-wrap gap-3">
        {inquiry.summaryPath ? (
          <Button asChild variant="secondary">
            <a href={`/inquiry/${inquiry.id}/summary`}>
              <Download className="size-4" aria-hidden="true" />
              Download the summary
            </a>
          </Button>
        ) : null}

        {session ? (
          <Button asChild>
            <Link href="/account/inquiries">Go to my inquiries</Link>
          </Button>
        ) : null}

        <Button asChild variant="secondary">
          <Link href="/products">Continue browsing</Link>
        </Button>
      </div>
    </Container>
  );
}
