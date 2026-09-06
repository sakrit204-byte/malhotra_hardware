import Link from "next/link";

import { Monogram } from "@/components/site/monogram";
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
          <div className="flex h-[4.5rem] items-center justify-between">
            <Link href="/" className="flex items-center gap-2.5">
              <Monogram className="size-8" />
              <span className="font-display text-[1.375rem] leading-none tracking-tight text-ink">
                {site.name}
              </span>
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

      <main id="main" className="flex flex-1 items-start justify-center px-5 py-14 sm:py-24">
        {/* The form sits on a raised sheet with a rule at its head, so the one
            thing on the page reads as the one thing on the page. */}
        <div className="w-full max-w-md border-t border-ink bg-surface-raised px-6 pb-8 pt-7 shadow-overlay sm:px-8 sm:pb-10">
          {children}
        </div>
      </main>

      <SiteFooter />
    </>
  );
}
