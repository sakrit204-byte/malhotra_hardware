import Link from "next/link";

import { SiteFooter } from "@/components/site/site-footer";
import { SiteHeader } from "@/components/site/site-header";
import { Button } from "@/components/ui/button";
import { Container } from "@/components/ui/container";

/**
 * Shown for any address that does not exist, and whenever a page calls
 * notFound. It carries the site chrome so a customer who lands here from a
 * stale link can carry on rather than reaching for the back button.
 */
export default function NotFound() {
  return (
    <>
      <a href="#main" className="skip-link">
        Skip to main content
      </a>
      <SiteHeader />
      <main id="main" className="flex flex-1 items-center">
        <Container width="narrow" className="py-24 text-center">
          <p className="eyebrow">Page not found</p>
          <h1 className="mt-4 text-4xl">We could not find that page</h1>
          <p className="mx-auto mt-4 max-w-md leading-relaxed text-ink-soft">
            The address may have changed, or the product may no longer be published. The
            catalogue below has everything we currently stock.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Button asChild size="lg">
              <Link href="/products">Browse the catalogue</Link>
            </Button>
            <Button asChild size="lg" variant="secondary">
              <Link href="/contact">Contact us</Link>
            </Button>
          </div>
        </Container>
      </main>
      <SiteFooter />
    </>
  );
}
