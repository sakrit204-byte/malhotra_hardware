import { RevealOnScroll } from "@/components/site/reveal-on-scroll";
import { SiteFooter } from "@/components/site/site-footer";
import { SiteHeader } from "@/components/site/site-header";
import { requireUser } from "@/server/auth/guards";
import { readBasket } from "@/server/inquiry/basket";
import { resolveBasket } from "@/server/inquiry/resolve";

/**
 * Shell for the customer account.
 *
 * The real access check lives here rather than in middleware: this runs on the
 * server with the database in reach, so it can confirm the session is genuine
 * and the account is still active, not merely that a cookie exists.
 */
export default async function AccountLayout({
  children,
}: LayoutProps<"/">) {
  const session = await requireUser("/account/inquiries");

  const resolved = await resolveBasket(await readBasket());

  return (
    <>
      <RevealOnScroll />
      <a href="#main" className="skip-link">
        Skip to main content
      </a>
      <SiteHeader
        inquiryCount={resolved.itemCount}
        account={{ fullName: session.fullName, emailVerified: session.emailVerified }}
      />
      <main id="main" className="flex-1">
        {children}
      </main>
      <SiteFooter />
    </>
  );
}
