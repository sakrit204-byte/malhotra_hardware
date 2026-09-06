import { StaffNav } from "@/components/staff/staff-nav";
import { requireRole } from "@/server/auth/guards";
import { prisma } from "@/server/db/prisma";

/**
 * Shell for the manager and administrator platforms.
 *
 * A manager is the minimum here. Administrator only pages check again for
 * themselves, because this layout wraps both and the weaker of the two checks
 * must not become the only one.
 *
 * The chrome is deliberately unlike the public site: a fixed sidebar, denser
 * type, no catalogue navigation and no inquiry basket. These are screens people
 * work in all day, not pages they browse.
 */
export default async function StaffLayout({ children }: LayoutProps<"/">) {
  const staff = await requireRole("MANAGER", "/manager");

  const unreadCount = await prisma.inquiry.count({ where: { unreadForManager: true } });

  return (
    <div className="flex min-h-screen flex-col lg:flex-row">
      <a href="#main" className="skip-link">
        Skip to main content
      </a>

      <aside className="shrink-0 border-b border-line bg-surface-raised lg:sticky lg:top-0 lg:h-screen lg:w-60 lg:border-b-0 lg:border-r">
        <StaffNav
          role={staff.role}
          fullName={staff.fullName}
          unreadCount={unreadCount}
        />
      </aside>

      <main id="main" className="min-w-0 flex-1 bg-surface">
        {children}
      </main>
    </div>
  );
}
