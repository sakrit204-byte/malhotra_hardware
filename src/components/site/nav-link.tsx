"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

import { cn } from "@/lib/cn";

/**
 * A navigation link that knows whether it is the current page.
 *
 * The active state is carried by `aria-current` as well as by the underline, so
 * it is announced rather than only seen.
 */
export function NavLink({ href, children }: { href: string; children: ReactNode }) {
  const pathname = usePathname();
  const active = href === "/" ? pathname === "/" : pathname.startsWith(href);

  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "relative inline-flex h-[4.5rem] items-center px-3 text-sm transition-colors duration-[--duration-quick]",
        "after:absolute after:inset-x-3 after:bottom-0 after:h-px after:origin-left after:scale-x-0 after:bg-ink after:transition-transform after:duration-[--duration-quick] after:ease-[--ease-quiet]",
        active
          ? "text-ink after:scale-x-100"
          : "text-ink-soft hover:text-ink hover:after:scale-x-100",
      )}
    >
      {children}
    </Link>
  );
}
