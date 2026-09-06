"use client";

import { Menu, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { cn } from "@/lib/cn";
import { primaryNavigation } from "@/lib/site";
import { logoutAction } from "@/server/actions/auth";

/**
 * Navigation for narrow screens.
 *
 * The panel is a real dialog: focus moves into it, Escape closes it, the page
 * behind it stops scrolling, and the trigger reports its own state to assistive
 * technology. Everything inside is reachable by keyboard and by touch.
 */
export function MobileNav({
  inquiryCount = 0,
  account = null,
}: {
  inquiryCount?: number;
  account?: { fullName: string; emailVerified: boolean } | null;
}) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const panelRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  // The panel closes from the link that was activated rather than from an
  // effect watching the path, so there is no render where the new page is
  // showing behind an open menu.
  const close = () => setOpen(false);

  useEffect(() => {
    if (!open) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
        triggerRef.current?.focus();
      }
    };

    document.addEventListener("keydown", onKeyDown);
    panelRef.current?.querySelector<HTMLAnchorElement>("a")?.focus();

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        className="inline-flex size-10 items-center justify-center rounded-md text-ink transition-colors hover:bg-surface-sunken lg:hidden"
        aria-expanded={open}
        aria-controls="mobile-navigation"
        onClick={() => setOpen((value) => !value)}
      >
        {open ? (
          <X className="size-5" aria-hidden="true" />
        ) : (
          <Menu className="size-5" aria-hidden="true" />
        )}
        <span className="sr-only">{open ? "Close menu" : "Open menu"}</span>
      </button>

      {open ? (
        <div
          className="fixed inset-0 top-16 z-40 bg-surface lg:hidden"
          id="mobile-navigation"
          role="dialog"
          aria-modal="true"
          aria-label="Site navigation"
          ref={panelRef}
        >
          <nav className="flex h-full flex-col overflow-y-auto px-5 py-6">
            <ul className="space-y-1">
              {primaryNavigation.map((item) => {
                const active =
                  item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);

                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      onClick={close}
                      className={cn(
                        "block rounded-md px-3 py-3 text-lg transition-colors",
                        active
                          ? "bg-surface-sunken text-ink"
                          : "text-ink-soft hover:bg-surface-sunken hover:text-ink",
                      )}
                      aria-current={active ? "page" : undefined}
                    >
                      {item.label}
                    </Link>
                  </li>
                );
              })}
            </ul>

            <div className="mt-6 space-y-1 border-t border-line pt-6">
              <Link
                href="/inquiry"
                onClick={close}
                className="block rounded-md px-3 py-3 text-lg text-ink-soft transition-colors hover:bg-surface-sunken hover:text-ink"
              >
                Inquiry
                {inquiryCount > 0 ? (
                  <span className="ml-2 text-sm text-brass-strong">
                    {inquiryCount} selected
                  </span>
                ) : null}
              </Link>
              {account ? (
                <>
                  <Link
                    href="/account/inquiries"
                    onClick={close}
                    className="block rounded-md px-3 py-3 text-lg text-ink-soft transition-colors hover:bg-surface-sunken hover:text-ink"
                  >
                    My inquiries
                    <span className="ml-2 text-sm text-ink-muted">
                      {account.fullName.split(" ")[0]}
                    </span>
                  </Link>
                  <form action={logoutAction}>
                    <button
                      type="submit"
                      className="block w-full rounded-md px-3 py-3 text-left text-lg text-ink-soft transition-colors hover:bg-surface-sunken hover:text-ink"
                    >
                      Sign out
                    </button>
                  </form>
                </>
              ) : (
                <Link
                  href="/login"
                  onClick={close}
                  className="block rounded-md px-3 py-3 text-lg text-ink-soft transition-colors hover:bg-surface-sunken hover:text-ink"
                >
                  Sign in
                </Link>
              )}
            </div>

            <form action="/products" className="mt-6 border-t border-line pt-6">
              <label htmlFor="mobile-search" className="text-[0.8125rem] font-medium">
                Search the catalogue
              </label>
              <input
                id="mobile-search"
                name="q"
                type="search"
                placeholder="Product name or code"
                className="mt-2 h-11 w-full rounded-md border border-line-strong bg-surface-raised px-3 text-base"
              />
            </form>
          </nav>
        </div>
      ) : null}
    </>
  );
}
