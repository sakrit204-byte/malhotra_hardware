import Link from "next/link";

import { SiteFooter } from "@/components/site/site-footer";
import { Container } from "@/components/ui/container";
import { site } from "@/lib/site";

/**
 * Shell for the account forms.
 *
 * Deliberately quieter than the rest of the site: no catalogue navigation and
 * no inquiry basket, so that somebody signing in or resetting a password is not
 * offered five other things to do halfway through.
 */
export default function AuthLayout({ children }: LayoutProps<"/">) {
  return (
    <>
      <a href="#main" className="skip-link">
        Skip to main content
      </a>

      <header className="border-b border-line">
        <Container width="wide">
          <div className="flex h-16 items-center justify-between">
            <Link
              href="/"
              className="font-display text-lg leading-none tracking-tight text-ink"
            >
              {site.name}
            </Link>
            <Link
              href="/products"
              className="text-sm text-ink-soft underline underline-offset-4 hover:text-ink"
            >
              Browse the catalogue
            </Link>
          </div>
        </Container>
      </header>

      <main id="main" className="flex flex-1 items-start justify-center px-5 py-14 sm:py-20">
        <div className="w-full max-w-md">{children}</div>
      </main>

      <SiteFooter />
    </>
  );
}
