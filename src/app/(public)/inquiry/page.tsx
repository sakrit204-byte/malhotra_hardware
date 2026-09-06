import type { Metadata } from "next";
import Link from "next/link";
import { MessageCircle } from "lucide-react";

import { InquiryForm } from "@/components/inquiry/inquiry-form";
import { PruneBasket } from "@/components/inquiry/prune-basket";
import { InquiryLine } from "@/components/inquiry/inquiry-line";
import { WhatsappLink } from "@/components/site/whatsapp-link";
import { Button } from "@/components/ui/button";
import { Container } from "@/components/ui/container";
import { EmptyState } from "@/components/ui/states";
import { getSession } from "@/server/auth/session";
import { readBasket } from "@/server/inquiry/basket";
import { resolveBasket } from "@/server/inquiry/resolve";
import { getContactContent } from "@/server/repositories/content";

export const metadata: Metadata = {
  title: "Your inquiry",
  description:
    "Review the products you have selected, add quantities and notes, and send your inquiry to the Malhotra Enterprise team.",
  robots: { index: false, follow: false },
};

export default async function InquiryPage() {
  const [session, contact, basket] = await Promise.all([
    getSession(),
    getContactContent(),
    readBasket(),
  ]);

  // Resolving reads the current state of every product. It never writes: a page
  // may not modify a cookie while it renders, so when something has gone stale
  // the stored basket is brought back into line by PruneBasket below.
  const resolved = await resolveBasket(basket);

  const whatsappMessage =
    resolved.lines.length > 0
      ? `Hello Malhotra Enterprise, I would like to ask about ${resolved.lines
          .slice(0, 3)
          .map((line) => line.product.code)
          .join(", ")}.`
      : "Hello Malhotra Enterprise, I would like to ask about your hardware range.";

  return (
    <Container width="default" className="py-10 lg:py-14">
      <div className="border-b border-line pb-8">
        <p className="note border-t border-ink pt-3">Inquiry</p>
        <h1 className="mt-6 text-title text-ink">Your inquiry</h1>
        <p className="mt-3 max-w-2xl leading-relaxed text-ink-soft">
          Check the products and quantities, tell us about the project, and send it to our
          team. You will get a reference number straight away and a written summary by
          email. An account is not required.
        </p>
      </div>

      {resolved.changed ? <PruneBasket /> : null}

      {resolved.dropped.length > 0 ? (
        <div
          role="status"
          className="mt-8 border-l-2 border-caution bg-caution-wash px-4 py-3 text-[0.9375rem] text-ink-soft"
        >
          {resolved.dropped.length === 1
            ? "One product has been removed from your inquiry because it is no longer available."
            : `${resolved.dropped.length} products have been removed from your inquiry because they are no longer available.`}{" "}
          Everything else is unchanged.
        </div>
      ) : null}

      {resolved.lines.length === 0 ? (
        <div className="mt-10">
          <EmptyState
            title="Your inquiry is empty"
            description="Browse the catalogue and add the products you need. You can set quantities and add notes here before sending."
            action={
              <div className="flex flex-wrap justify-center gap-3">
                <Button asChild>
                  <Link href="/products">Browse products</Link>
                </Button>
                <Button asChild variant="secondary">
                  <Link href="/contact">Contact us instead</Link>
                </Button>
              </div>
            }
          />
        </div>
      ) : (
        <div className="mt-10 grid gap-12 lg:grid-cols-[1fr_20rem] lg:gap-16">
          <div>
            <section aria-labelledby="selected-products">
              <div className="flex items-end justify-between gap-4">
                <h2 id="selected-products" className="text-2xl">
                  Selected products
                </h2>
                <p className="note">
                  {resolved.itemCount} {resolved.itemCount === 1 ? "product" : "products"},{" "}
                  {resolved.totalQuantity} in total
                </p>
              </div>

              <ul className="mt-2">
                {resolved.lines.map((line) => (
                  <li key={`${line.productId}:${line.variantId ?? ""}`} className="contents">
                    <InquiryLine line={line} />
                  </li>
                ))}
              </ul>

              <div className="border-t border-line pt-6">
                <Button asChild variant="secondary">
                  <Link href="/products">Add more products</Link>
                </Button>
              </div>
            </section>

            <section className="mt-14 border-t border-line pt-10" aria-labelledby="your-details">
              <h2 id="your-details" className="sr-only">
                Your details
              </h2>
              <InquiryForm
                account={
                  session
                    ? { email: session.email, fullName: session.fullName }
                    : null
                }
                itemCount={resolved.itemCount}
              />
            </section>
          </div>

          {/* ------------------------------------------------------- aside */}
          <aside className="lg:sticky lg:top-24 lg:self-start">

            <div className="border-t border-ink pt-3">
              <h2 className="note">What happens next</h2>
              <ol className="mt-5 divide-y divide-line">
                {[
                  ["You send the inquiry", "We give you a reference number immediately and email you a summary."],
                  ["Our team reviews it", "We confirm availability and lead times, usually within one working day."],
                  ["You hear back in writing", "Our reply arrives by email and you can answer in the same thread."],
                ].map(([title, body], index) => (
                  <li key={title} className="flex gap-4 py-4">
                    <span className="font-display text-2xl leading-none text-brand">
                      {String(index + 1).padStart(2, "0")}
                    </span>
                    <span className="text-[0.875rem] leading-relaxed text-ink-soft">
                      <span className="block text-[0.9375rem] font-medium text-ink">{title}</span>
                      {body}
                    </span>
                  </li>
                ))}
              </ol>
            </div>

            <div className="mt-8 border-t border-ink pt-3">
              <h2 className="note">Prefer to talk</h2>
              <ul className="mt-4 space-y-2.5 text-[0.9375rem]">
                <li>
                  <a
                    href={`tel:${contact.phone.replace(/\s+/g, "")}`}
                    className="text-ink underline underline-offset-4"
                  >
                    {contact.phone}
                  </a>
                </li>
                <li className="flex items-center gap-2">
                  <MessageCircle
                    className="size-3.5 shrink-0 text-ink-muted"
                    aria-hidden="true"
                  />
                  <WhatsappLink
                    number={contact.whatsapp}
                    message={whatsappMessage}
                    className="text-ink underline underline-offset-4"
                  >
                    Ask on WhatsApp
                  </WhatsappLink>
                </li>
              </ul>
            </div>

            {!session ? (
              <div className="mt-8 border-t border-ink pt-3">
                <h2 className="note">Have an account</h2>
                <p className="mt-3 text-[0.875rem] leading-relaxed text-ink-soft">
                  Signing in keeps every inquiry in one place, but it is not required. You
                  can send this now and create an account later.
                </p>
                <p className="mt-3">
                  <Link
                    href="/login?next=/inquiry"
                    className="text-[0.9375rem] text-brand underline underline-offset-4"
                  >
                    Sign in
                  </Link>
                </p>
              </div>
            ) : null}
          </aside>
        </div>
      )}
    </Container>
  );
}
