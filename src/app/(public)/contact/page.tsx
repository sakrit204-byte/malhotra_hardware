import type { Metadata } from "next";
import Link from "next/link";
import { Clock, Mail, MapPin, MessageCircle, Phone } from "lucide-react";

import { WhatsappLink } from "@/components/site/whatsapp-link";
import { Button } from "@/components/ui/button";
import { Container } from "@/components/ui/container";
import { site } from "@/lib/site";
import { getContactContent } from "@/server/repositories/content";

export const metadata: Metadata = {
  title: "Contact",
  description:
    "Call, email or message Malhotra Enterprise in Kathmandu about architectural and home hardware, or send an inquiry with the products you need.",
  alternates: { canonical: "/contact" },
};

export default async function ContactPage() {
  const contact = await getContactContent();

  const structuredData = {
    "@context": "https://schema.org",
    "@type": "HardwareStore",
    name: site.name,
    telephone: contact.phone,
    email: contact.email,
    address: {
      "@type": "PostalAddress",
      streetAddress: contact.addressLines[0],
      addressLocality: site.city,
      addressCountry: site.country,
    },
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />

      <Container width="default" className="py-14 lg:py-20">
        <p className="note border-t border-ink pt-3">Contact</p>
        <h1 className="mt-6 max-w-[16ch] text-title text-ink">Talk to our team</h1>
        <p className="mt-4 max-w-xl leading-relaxed text-ink-soft">
          For anything specific to a project, an inquiry gives us the product list and the
          quantities in one place, and you get a written summary back. For a quick question,
          call or message us.
        </p>

        <div className="mt-12 grid gap-12 lg:grid-cols-2">
          <div>
            <h2 className="text-2xl">Reach us directly</h2>

            <dl className="mt-6 space-y-6">
              <div className="flex gap-4">
                <Phone className="mt-0.5 size-5 shrink-0 text-ink-muted" aria-hidden="true" />
                <div>
                  <dt className="text-sm font-medium text-ink">Telephone</dt>
                  <dd className="mt-1">
                    <a
                      href={`tel:${contact.phone.replace(/\s+/g, "")}`}
                      className="text-ink-soft underline underline-offset-4 hover:text-ink"
                    >
                      {contact.phone}
                    </a>
                  </dd>
                </div>
              </div>

              <div className="flex gap-4">
                <MessageCircle
                  className="mt-0.5 size-5 shrink-0 text-ink-muted"
                  aria-hidden="true"
                />
                <div>
                  <dt className="text-sm font-medium text-ink">WhatsApp</dt>
                  <dd className="mt-1">
                    <WhatsappLink
                      number={contact.whatsapp}
                      message="Hello Malhotra Enterprise, I would like to ask about your hardware range."
                      className="text-ink-soft underline underline-offset-4 hover:text-ink"
                    >
                      Send us a message
                    </WhatsappLink>
                    <p className="mt-1 text-[0.8125rem] text-ink-muted">
                      Send a photograph if you need to match existing hardware.
                    </p>
                  </dd>
                </div>
              </div>

              <div className="flex gap-4">
                <Mail className="mt-0.5 size-5 shrink-0 text-ink-muted" aria-hidden="true" />
                <div>
                  <dt className="text-sm font-medium text-ink">Email</dt>
                  <dd className="mt-1">
                    <a
                      href={`mailto:${contact.email}`}
                      className="break-all text-ink-soft underline underline-offset-4 hover:text-ink"
                    >
                      {contact.email}
                    </a>
                  </dd>
                </div>
              </div>

              <div className="flex gap-4">
                <MapPin className="mt-0.5 size-5 shrink-0 text-ink-muted" aria-hidden="true" />
                <div>
                  <dt className="text-sm font-medium text-ink">Address</dt>
                  <dd className="mt-1">
                    <address className="space-y-0.5 not-italic text-ink-soft">
                      {contact.addressLines.map((line) => (
                        <span key={line} className="block">
                          {line}
                        </span>
                      ))}
                    </address>
                  </dd>
                </div>
              </div>

              {contact.hours.length > 0 ? (
                <div className="flex gap-4">
                  <Clock
                    className="mt-0.5 size-5 shrink-0 text-ink-muted"
                    aria-hidden="true"
                  />
                  <div>
                    <dt className="text-sm font-medium text-ink">Opening hours</dt>
                    <dd className="mt-1 space-y-1 text-ink-soft">
                      {contact.hours.map((entry) => (
                        <div key={entry.days} className="flex gap-3">
                          <span className="w-40 shrink-0">{entry.days}</span>
                          <span>{entry.time}</span>
                        </div>
                      ))}
                    </dd>
                  </div>
                </div>
              ) : null}
            </dl>
          </div>

          <div className="border-t border-line pt-10 lg:border-l lg:border-t-0 lg:pl-12 lg:pt-0">
            <h2 className="text-2xl">Send an inquiry instead</h2>
            <p className="mt-4 leading-relaxed text-ink-soft">
              An inquiry keeps everything together: the products, the quantities, your notes
              and any drawings you want to attach. You get a reference number straight away
              and a written summary by email, and our team replies in the same thread.
            </p>
            <ul className="mt-6 space-y-2 text-[0.9375rem] text-ink-soft">
              <li>No account needed.</li>
              <li>A reference number you can quote when you call.</li>
              <li>Everything answered in writing.</li>
            </ul>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button asChild size="lg">
                <Link href="/inquiry">Start an inquiry</Link>
              </Button>
              <Button asChild size="lg" variant="secondary">
                <Link href="/products">Browse products</Link>
              </Button>
            </div>
          </div>
        </div>
      </Container>
    </>
  );
}
