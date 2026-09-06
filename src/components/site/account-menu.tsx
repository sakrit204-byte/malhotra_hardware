"use client";

import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import Link from "next/link";
import { useRef } from "react";
import { ChevronDown, LogOut, UserRound } from "lucide-react";

import { logoutAction } from "@/server/actions/auth";

/**
 * Who is signed in, and how to stop being signed in.
 *
 * Built on a real menu primitive, so it opens with the keyboard, closes on
 * Escape, moves focus properly and announces itself. Signing out is a form
 * posting to a server action rather than a link, because signing out changes
 * state and a link should never do that.
 *
 * The form lives outside the menu. Choosing an item closes the menu, and the
 * menu is rendered in a portal that is removed when it closes, so a form nested
 * inside it was being torn down before the browser could submit it. That is
 * what stopped signing out from doing anything at all.
 */
export function AccountMenu({
  fullName,
  emailVerified,
}: {
  fullName: string;
  emailVerified: boolean;
}) {
  const firstName = fullName.split(" ")[0] ?? fullName;
  const signOutRef = useRef<HTMLFormElement>(null);

  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger className="inline-flex h-10 items-center gap-1.5 rounded-md px-3 text-sm text-ink transition-colors hover:bg-surface-sunken data-[state=open]:bg-surface-sunken">
        <UserRound className="size-5 shrink-0" aria-hidden="true" />
        <span className="hidden max-w-24 truncate lg:inline">{firstName}</span>
        {!emailVerified ? (
          <span
            className="size-1.5 rounded-full bg-caution"
            aria-label="Email address not confirmed"
          />
        ) : null}
        <ChevronDown className="hidden size-3.5 text-ink-muted lg:block" aria-hidden="true" />
      </DropdownMenu.Trigger>

      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align="end"
          sideOffset={6}
          className="z-50 w-56 rounded-lg border border-line bg-surface-raised p-1.5 shadow-overlay"
        >
          <div className="px-2.5 py-2">
            <p className="truncate text-sm font-medium text-ink">{fullName}</p>
            {!emailVerified ? (
              <p className="mt-0.5 text-[0.75rem] text-caution">
                Email address not confirmed
              </p>
            ) : null}
          </div>

          <DropdownMenu.Separator className="my-1 h-px bg-line" />

          <DropdownMenu.Item asChild>
            <Link
              href="/account/inquiries"
              className="flex cursor-pointer items-center gap-2 rounded-md px-2.5 py-2 text-sm text-ink-soft outline-none transition-colors hover:bg-surface-sunken hover:text-ink data-[highlighted]:bg-surface-sunken data-[highlighted]:text-ink"
            >
              My inquiries
            </Link>
          </DropdownMenu.Item>

          <DropdownMenu.Item asChild>
            <Link
              href="/inquiry"
              className="flex cursor-pointer items-center gap-2 rounded-md px-2.5 py-2 text-sm text-ink-soft outline-none transition-colors hover:bg-surface-sunken hover:text-ink data-[highlighted]:bg-surface-sunken data-[highlighted]:text-ink"
            >
              Current inquiry
            </Link>
          </DropdownMenu.Item>

          <DropdownMenu.Separator className="my-1 h-px bg-line" />

          <DropdownMenu.Item
            onSelect={() => signOutRef.current?.requestSubmit()}
            className="flex cursor-pointer items-center gap-2 rounded-md px-2.5 py-2 text-sm text-ink-soft outline-none transition-colors hover:bg-surface-sunken hover:text-ink data-[highlighted]:bg-surface-sunken data-[highlighted]:text-ink"
          >
            <LogOut className="size-4" aria-hidden="true" />
            Sign out
          </DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>

      {/* Outside the portal, so it is still mounted when the menu closes. */}
      <form ref={signOutRef} action={logoutAction} className="hidden" />
    </DropdownMenu.Root>
  );
}
