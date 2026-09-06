import Link from "next/link";

import { WhatsappLink } from "@/components/site/whatsapp-link";
import { Container } from "@/components/ui/container";
import { getContactContent } from "@/server/repositories/content";
import { primaryNavigation, site } from "@/lib/site";

const catalogueLinks = [
  { label: "All products", href: "/products" },
  { label: "Door handles", href: "/products?category=door-handles" },
  { label: "Door locks", href: "/products?category=door-locks" },
  { label: "Cabinet hardware", href: "/products?category=cabinet-hardware" },
];

const helpLinks = [
  { label: "Start an inquiry", href: "/inquiry" },
  { label: "My inquiries", href: "/account/inquiries" },
  { label: "Contact us", href: "/contact" },
  { label: "About us", href: "/about" },
];

export async function SiteFooter() {
  const contact = await getContactContent();

  return (
    <footer className="mt-auto border-t border-line bg-surface-sunken">
      <Container width="wide" className="py-14">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <p className="font-display text-lg text-ink">{site.name}</p>
            <p className="mt-2 max-w-xs text-sm leading-relaxed text-ink-soft">
              Architectural and home hardware supplied across the Kathmandu valley.
            </p>
            <address className="mt-4 space-y-0.5 text-sm not-italic text-ink-soft">
              {contact.addressLines.map((line) => (
                <span key={line} className="block">
                  {line}
                </span>
              ))}
            </address>
          </div>

          <nav aria-label="Catalogue">
            <h2 className="eyebrow">Catalogue</h2>
            <ul className="mt-4 space-y-2.5">
              {catalogueLinks.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-sm text-ink-soft transition-colors hover:text-ink"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <nav aria-label="Help">
            <h2 className="eyebrow">Inquiries</h2>
            <ul className="mt-4 space-y-2.5">
              {helpLinks.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-sm text-ink-soft transition-colors hover:text-ink"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <div>
            <h2 className="eyebrow">Contact</h2>
            <ul className="mt-4 space-y-2.5 text-sm text-ink-soft">
              <li>
                <a
                  href={`tel:${contact.phone.replace(/\s+/g, "")}`}
                  className="transition-colors hover:text-ink"
                >
                  {contact.phone}
                </a>
              </li>
              <li>
                <a
                  href={`mailto:${contact.email}`}
                  className="break-all transition-colors hover:text-ink"
                >
                  {contact.email}
                </a>
              </li>
              <li>
                <WhatsappLink
                  number={contact.whatsapp}
                  message="Hello Malhotra Enterprise, I would like to ask about your hardware range."
                  className="transition-colors hover:text-ink"
                >
                  Message us on WhatsApp
                </WhatsappLink>
              </li>
            </ul>

            {contact.hours.length > 0 ? (
              <dl className="mt-4 space-y-1 text-sm text-ink-muted">
                {contact.hours.map((entry) => (
                  <div key={entry.days} className="flex gap-2">
                    <dt>{entry.days}</dt>
                    <dd className="text-ink-soft">{entry.time}</dd>
                  </div>
                ))}
              </dl>
            ) : null}
          </div>
        </div>

        <div className="mt-12 flex flex-col gap-3 border-t border-line pt-6 text-[0.8125rem] text-ink-muted sm:flex-row sm:items-center sm:justify-between">
          <p>
            {new Date().getFullYear()} {site.name}, {site.city}, {site.country}.
          </p>
          <nav aria-label="Secondary">
            <ul className="flex gap-4">
              {primaryNavigation.map((item) => (
                <li key={item.href}>
                  <Link href={item.href} className="transition-colors hover:text-ink">
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </div>
      </Container>
    </footer>
  );
}
