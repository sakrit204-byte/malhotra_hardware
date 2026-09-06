import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Container, Section } from "@/components/ui/container";
import { imageUrl } from "@/lib/catalogue";
import { site } from "@/lib/site";
import { getAboutContent, getContactContent } from "@/server/repositories/content";

export const metadata: Metadata = {
  title: "About us",
  description:
    "Malhotra Enterprise supplies architectural and home hardware to builders, architects and homeowners across the Kathmandu valley.",
  alternates: { canonical: "/about" },
};

export default async function AboutPage() {
  const [about, contact] = await Promise.all([getAboutContent(), getContactContent()]);
  const image = imageUrl(about.image);

  return (
    <>
      <Container width="default" className="py-14 lg:py-20">
        <p className="note border-t border-ink pt-3">About {site.name}</p>
        <h1 className="mt-6 max-w-[16ch] text-title text-ink">{about.headline}</h1>

        <div className="mt-10 grid gap-10 lg:grid-cols-[1.1fr_1fr] lg:gap-16">
          <div className="space-y-5">
            {about.paragraphs.map((paragraph) => (
              <p key={paragraph.slice(0, 40)} className="leading-relaxed text-ink-soft">
                {paragraph}
              </p>
            ))}
          </div>

          {image ? (
            <div className="relative aspect-4/3 overflow-hidden bg-surface-sunken lg:aspect-3/4">
              <Image
                src={image}
                alt="Modern house on a hillside surrounded by trees"
                fill
                sizes="(min-width: 1024px) 40vw, 100vw"
                className="object-cover"
              />
            </div>
          ) : null}
        </div>
      </Container>

      <Section tone="sunken">
        <Container width="default">
          <h2 className="text-3xl">How we work with you</h2>

          <ol className="mt-10 grid gap-8 sm:grid-cols-3">
            {[
              {
                title: "Send what you have",
                body: "A door schedule, a drawing, a photograph of an existing handle, or just a list. Whatever you have is enough to start.",
              },
              {
                title: "We work it through",
                body: "Our team confirms what is in stock, what needs ordering, and where a different specification would serve the project better.",
              },
              {
                title: "You get it in writing",
                body: "Availability, lead times and pricing come back as a written summary you can put in front of a client or a contractor.",
              },
            ].map((step, index) => (
              <li key={step.title}>
                <p className="font-mono text-[0.75rem] text-ink-muted" aria-hidden="true">
                  {String(index + 1).padStart(2, "0")}
                </p>
                <h3 className="mt-2 text-lg">{step.title}</h3>
                <p className="mt-2 text-[0.9375rem] leading-relaxed text-ink-soft">
                  {step.body}
                </p>
              </li>
            ))}
          </ol>

          <div className="mt-12 flex flex-wrap gap-3">
            <Button asChild size="lg">
              <Link href="/inquiry">Start an inquiry</Link>
            </Button>
            <Button asChild size="lg" variant="secondary">
              <Link href="/contact">Contact the team</Link>
            </Button>
          </div>
        </Container>
      </Section>

      <Container width="default" className="py-14">
        <h2 className="text-2xl">Visit the counter</h2>
        <address className="mt-4 space-y-0.5 not-italic leading-relaxed text-ink-soft">
          {contact.addressLines.map((line) => (
            <span key={line} className="block">
              {line}
            </span>
          ))}
        </address>
        {contact.mapNote ? (
          <p className="mt-3 text-sm text-ink-muted">{contact.mapNote}</p>
        ) : null}
      </Container>
    </>
  );
}
