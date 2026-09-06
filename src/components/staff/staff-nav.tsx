"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Boxes,
  FolderTree,
  Gauge,
  House,
  Images,
  LayoutDashboard,
  LogOut,
  MessageSquare,
  ScrollText,
  Users,
} from "lucide-react";

import { cn } from "@/lib/cn";
import type { RoleName } from "@/lib/roles";
import { hasRole } from "@/lib/roles";
import { logoutAction } from "@/server/actions/auth";

/**
 * Navigation for the manager and administrator platforms.
 *
 * One list, filtered by role. A manager never sees a link they cannot open,
 * which is kinder than showing it and refusing, and it keeps the sidebar short
 * for the people who use it all day.
 *
 * The current page is marked with `aria-current` as well as with colour, so it
 * is announced and not only seen.
 */

type Item = {
  href: string;
  label: string;
  icon: typeof LayoutDashboard;
  minimumRole: RoleName;
  /** Matches child routes too, so a detail page keeps its parent highlighted. */
  prefix?: boolean;
};

const items: Item[] = [
  { href: "/manager", label: "Dashboard", icon: LayoutDashboard, minimumRole: "MANAGER" },
  {
    href: "/manager/inquiries",
    label: "Inquiries",
    icon: MessageSquare,
    minimumRole: "MANAGER",
    prefix: true,
  },
  { href: "/admin", label: "Administration", icon: Gauge, minimumRole: "ADMIN" },
  { href: "/admin/home", label: "Home page", icon: House, minimumRole: "ADMIN", prefix: true },
  {
    href: "/admin/products",
    label: "Products",
    icon: Boxes,
    minimumRole: "ADMIN",
    prefix: true,
  },
  {
    href: "/admin/categories",
    label: "Categories",
    icon: FolderTree,
    minimumRole: "ADMIN",
    prefix: true,
  },
  {
    href: "/admin/content",
    label: "Site content",
    icon: Images,
    minimumRole: "ADMIN",
    prefix: true,
  },
  { href: "/admin/users", label: "People", icon: Users, minimumRole: "ADMIN", prefix: true },
  {
    href: "/admin/activity",
    label: "Activity",
    icon: ScrollText,
    minimumRole: "ADMIN",
    prefix: true,
  },
];

export function StaffNav({
  role,
  fullName,
  unreadCount,
}: {
  role: RoleName;
  fullName: string;
  unreadCount: number;
}) {
  const pathname = usePathname();

  const visible = items.filter((item) => hasRole({ role }, item.minimumRole));

  return (
    <div className="flex h-full flex-col">
      <div className="px-5 py-5">
        <Link href="/" className="font-display text-lg leading-none tracking-tight text-ink">
          Malhotra Enterprise
        </Link>
        <p className="mt-1 text-[0.75rem] uppercase tracking-[0.08em] text-ink-muted">
          {role === "ADMIN" ? "Administrator" : "Manager"}
        </p>
      </div>

      <nav aria-label="Staff" className="flex-1 px-3">
        <ul className="space-y-0.5">
          {visible.map((item) => {
            const active = item.prefix
              ? pathname === item.href || pathname.startsWith(`${item.href}/`)
              : pathname === item.href;

            const Icon = item.icon;

            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "flex items-center gap-3 rounded-md px-2.5 py-2 text-[0.9375rem] transition-colors",
                    active
                      ? "bg-surface-sunken font-medium text-ink"
                      : "text-ink-soft hover:bg-surface-sunken hover:text-ink",
                  )}
                >
                  <Icon className="size-4 shrink-0" aria-hidden="true" />
                  <span className="flex-1">{item.label}</span>
                  {item.href === "/manager/inquiries" && unreadCount > 0 ? (
                    <span
                      className="rounded-sm bg-brick px-1.5 text-[0.6875rem] font-medium leading-5 text-white"
                      aria-label={`${unreadCount} waiting`}
                    >
                      {unreadCount}
                    </span>
                  ) : null}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="border-t border-line px-3 py-3">
        <p className="truncate px-2.5 py-1 text-[0.8125rem] text-ink-muted">{fullName}</p>
        <form action={logoutAction}>
          <button
            type="submit"
            className="flex w-full items-center gap-3 rounded-md px-2.5 py-2 text-left text-[0.9375rem] text-ink-soft transition-colors hover:bg-surface-sunken hover:text-ink"
          >
            <LogOut className="size-4 shrink-0" aria-hidden="true" />
            Sign out
          </button>
        </form>
      </div>
    </div>
  );
}
