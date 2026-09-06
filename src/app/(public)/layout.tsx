import { RevealOnScroll } from "@/components/site/reveal-on-scroll";
import { SiteFooter } from "@/components/site/site-footer";
import { SiteHeader } from "@/components/site/site-header";
import { getSession } from "@/server/auth/session";
import { readBasket } from "@/server/inquiry/basket";
import { resolveBasket } from "@/server/inquiry/resolve";

/**
 * Shell for every public page.
 *
 * The skip link is the first thing in the tab order, and the main landmark it
 * points at is the same on every page, so a keyboard or screen reader user can
 * pass the navigation once and get straight to the content.
 */
export default async function PublicLayout({ children }: LayoutProps<"/">) {
  // Resolved rather than counted from the cookie, so the header can never
  // advertise a product that has since been withdrawn, and so the running
  const [session, resolved] = await Promise.all([
    getSession(),
    resolveBasket(await readBasket()),
  ]);

  return (
    <>
      <RevealOnScroll />
      <a href="#main" className="skip-link">
        Skip to main content
      </a>
      <SiteHeader
        inquiryCount={resolved.itemCount}
        account={
          session ? { fullName: session.fullName, emailVerified: session.emailVerified } : null
        }
      />
      <main id="main" className="flex-1">
        {children}
      </main>
      <SiteFooter />
    </>
  );
}
