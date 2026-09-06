import { ClipboardList, Search, UserRound } from "lucide-react";
import Link from "next/link";

import { AccountMenu } from "@/components/site/account-menu";
import { MobileNav } from "@/components/site/mobile-nav";
import { Monogram } from "@/components/site/monogram";
import { NavLink } from "@/components/site/nav-link";
import { SearchBox } from "@/components/site/search-box";
import { Container } from "@/components/ui/container";
import { primaryNavigation, site } from "@/lib/site";

/**
 * Primary site navigation.
 *
 * Plain text labels on a hairline rule. No pills, no floating panel, nothing
 * that moves on its own. The search field is an ordinary form that submits to
 * the catalogue, so it works before any JavaScript loads.
 */
export function SiteHeader({
  inquiryCount = 0,
  account = null,
}: {
  inquiryCount?: number;
  /** Present when somebody is signed in. */
  account?: { fullName: string; emailVerified: boolean } | null;
}) {
  return (
    <header className="site-header sticky top-0 z-30 border-b border-line bg-surface/90 backdrop-blur-md">
      <Container width="wide">
        <div className="flex h-[4.5rem] items-center gap-7">
          <Link href="/" className="group flex shrink-0 items-center gap-2.5">
            <Monogram className="size-8 transition-transform duration-[--duration-settled] ease-[--ease-quiet] group-hover:scale-105" />
            <span className="font-display text-[1.375rem] leading-none tracking-tight text-ink">
              {site.name}
            </span>
            <span className="sr-only">, home page</span>
          </Link>

          <nav aria-label="Primary" className="hidden lg:block">
            <ul className="flex items-center gap-1">
              {primaryNavigation.map((item) => (
                <li key={item.href}>
                  <NavLink href={item.href}>{item.label}</NavLink>
                </li>
              ))}
            </ul>
          </nav>

          <div className="ml-auto flex items-center gap-1">
            <SearchBox />

            <Link
              href="/products"
              className="inline-flex size-10 items-center justify-center rounded-md text-ink transition-colors hover:bg-surface-sunken md:hidden"
            >
              <Search className="size-5" aria-hidden="true" />
              <span className="sr-only">Search products</span>
            </Link>

            <Link
              href="/inquiry"
              className="relative inline-flex h-10 items-center gap-2 rounded-md px-3 text-sm text-ink transition-colors hover:bg-surface-sunken"
            >
              <ClipboardList className="size-5 shrink-0" aria-hidden="true" />
              <span className="hidden sm:inline">Inquiry</span>
              {inquiryCount > 0 ? (
                <span
                  className="min-w-5 bg-brand px-1.5 text-center font-mono text-[0.6875rem] font-medium leading-5 text-white"
                  aria-label={`${inquiryCount} products selected`}
                >
                  {inquiryCount}
                </span>
              ) : null}
            </Link>

            {account ? (
              <div className="hidden sm:block">
                <AccountMenu
                  fullName={account.fullName}
                  emailVerified={account.emailVerified}
                />
              </div>
            ) : (
              <Link
                href="/login"
                className="hidden h-10 items-center gap-2 rounded-md px-3 text-sm text-ink transition-colors hover:bg-surface-sunken sm:inline-flex"
              >
                <UserRound className="size-5 shrink-0" aria-hidden="true" />
                <span className="hidden lg:inline">Sign in</span>
              </Link>
            )}

            <MobileNav inquiryCount={inquiryCount} account={account} />
          </div>
        </div>
      </Container>
    </header>
  );
}
