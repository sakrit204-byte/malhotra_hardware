import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";
import { Container, SectionHeading } from "@/components/ui/container";
import { Field, FormErrorSummary, Input, Select, Textarea } from "@/components/ui/field";
import { EmptyState, ErrorState, Skeleton } from "@/components/ui/states";

/**
 * Internal reference for the design system. Not part of the public site and not
 * reachable in a production build.
 */

export const metadata: Metadata = {
  title: "Design reference",
  robots: { index: false, follow: false },
};

const swatches = [
  { name: "Surface", token: "bg-surface", note: "Page ground" },
  { name: "Surface raised", token: "bg-surface-raised", note: "Cards and panels" },
  { name: "Surface sunken", token: "bg-surface-sunken", note: "Quiet bands" },
  { name: "Surface inverse", token: "bg-surface-inverse", note: "Dark sections" },
  { name: "Ink", token: "bg-ink", note: "Primary text" },
  { name: "Ink soft", token: "bg-ink-soft", note: "Secondary text" },
  { name: "Ink muted", token: "bg-ink-muted", note: "Hints and meta" },
  { name: "Line", token: "bg-line", note: "Hairline dividers" },
  { name: "Line strong", token: "bg-line-strong", note: "Control borders" },
  { name: "Brass", token: "bg-brass", note: "Accent" },
  { name: "Brass wash", token: "bg-brass-wash", note: "Accent ground" },
  { name: "Focus", token: "bg-focus", note: "Focus ring" },
];

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="border-t border-line py-12">
      <h2 className="eyebrow mb-6">{title}</h2>
      {children}
    </section>
  );
}

export default function StyleGuidePage() {
  if (process.env.NODE_ENV === "production") {
    notFound();
  }

  return (
    <Container className="py-16">
      <SectionHeading
        eyebrow="Internal reference"
        title="Design system"
        description="Every screen is assembled from these tokens and primitives. Nothing introduces a colour, a radius or a motion value of its own."
      />

      <Panel title="Palette">
        <ul className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {swatches.map((swatch) => (
            <li key={swatch.name}>
              <div
                className={`h-16 rounded-md border border-line ${swatch.token}`}
                aria-hidden="true"
              />
              <p className="mt-2 text-sm font-medium text-ink">{swatch.name}</p>
              <p className="text-[0.8125rem] text-ink-muted">{swatch.note}</p>
            </li>
          ))}
        </ul>
      </Panel>

      <Panel title="Typography">
        <div className="space-y-6">
          <div>
            <h1 className="text-5xl">Hardware that completes the space</h1>
            <p className="mt-1 text-[0.8125rem] text-ink-muted">
              Display, Newsreader, heading one
            </p>
          </div>
          <div>
            <h2 className="text-3xl">Featured product categories</h2>
            <p className="mt-1 text-[0.8125rem] text-ink-muted">
              Display, Newsreader, heading two
            </p>
          </div>
          <div>
            <p className="max-w-2xl leading-relaxed text-ink-soft">
              Interface and body text is set in Inter at a comfortable reading size.
              Specification tables, product descriptions and inquiry conversations all
              use this face so that long content stays legible on every device.
            </p>
            <p className="mt-1 text-[0.8125rem] text-ink-muted">Body, Inter</p>
          </div>
        </div>
      </Panel>

      <Panel title="Buttons">
        <div className="flex flex-wrap items-center gap-3">
          <Button>Explore products</Button>
          <Button variant="secondary">Start an inquiry</Button>
          <Button variant="brass">Add to inquiry</Button>
          <Button variant="ghost">View details</Button>
          <Button variant="quiet">Download summary</Button>
          <Button variant="danger">Remove</Button>
          <Button disabled>Unavailable</Button>
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <Button size="sm">Small</Button>
          <Button size="md">Medium</Button>
          <Button size="lg">Large</Button>
        </div>
      </Panel>

      <Panel title="Status chips">
        <div className="flex flex-wrap gap-2">
          <Chip>New</Chip>
          <Chip tone="info">Under review</Chip>
          <Chip tone="caution">Awaiting customer</Chip>
          <Chip tone="brass">Quotation sent</Chip>
          <Chip tone="positive">In stock</Chip>
          <Chip tone="critical">Out of stock</Chip>
        </div>
      </Panel>

      <Panel title="Form controls">
        <div className="grid max-w-3xl gap-5 sm:grid-cols-2">
          <Field name="fullName" label="Full name" required>
            {(control) => <Input {...control} placeholder="Anjali Shrestha" />}
          </Field>

          <Field
            name="phone"
            label="Phone number"
            required
            hint="Include the country code so our team can reach you."
          >
            {(control) => <Input {...control} type="tel" placeholder="+977 98 00000000" />}
          </Field>

          <Field name="finish" label="Preferred finish">
            {(control) => (
              <Select {...control} defaultValue="">
                <option value="">Any finish</option>
                <option value="satin-brass">Satin brass</option>
                <option value="matt-black">Matt black</option>
                <option value="brushed-steel">Brushed stainless steel</option>
              </Select>
            )}
          </Field>

          <Field
            name="email"
            label="Email address"
            required
            error="Enter an email address our team can reply to."
          >
            {(control) => <Input {...control} type="email" defaultValue="anjali@" />}
          </Field>

          <Field name="message" label="Message" className="sm:col-span-2" required>
            {(control) => (
              <Textarea
                {...control}
                placeholder="Tell us about the project, the quantities you need and when you need them."
              />
            )}
          </Field>
        </div>

        <FormErrorSummary
          className="mt-6 max-w-3xl"
          title="Check the inquiry form before sending"
          errors={[
            "Enter an email address our team can reply to.",
            "Add at least one product to the inquiry.",
          ]}
        />
      </Panel>

      <Panel title="Loading, empty and error">
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="space-y-3">
            <Skeleton className="aspect-4/3 w-full" />
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
          </div>
          <EmptyState
            title="No products match these filters"
            description="Try removing a filter or searching by product code."
            action={<Button variant="secondary">Clear filters</Button>}
          />
          <ErrorState
            description="The catalogue could not be loaded. Please try again in a moment."
            action={<Button variant="secondary">Try again</Button>}
          />
        </div>
      </Panel>
    </Container>
  );
}
