import type { Metadata } from "next";
import Link from "next/link";
import { KeyRound } from "lucide-react";

import { InviteForm } from "@/components/staff/invite-form";
import { Button } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";
import { formatInquiryDate } from "@/lib/inquiry-status";
import {
  changeRoleAction,
  sendStaffResetAction,
  toggleUserActiveAction,
} from "@/server/actions/admin-people";
import { requireRole } from "@/server/auth/guards";
import { listUsersForAdmin } from "@/server/repositories/admin";

export const metadata: Metadata = {
  title: "People",
  robots: { index: false, follow: false },
};

const ROLE_LABEL: Record<string, string> = {
  ADMIN: "Administrator",
  MANAGER: "Manager",
  USER: "Customer",
};

/**
 * Accounts.
 *
 * Two safeguards are visible on this screen rather than buried: an
 * administrator cannot change their own role or disable their own account, and
 * the last administrator cannot be removed. Both are enforced again on the
 * server, because a hidden button is not a permission.
 */
export default async function AdminUsersPage() {
  const admin = await requireRole("ADMIN", "/admin/users");
  const users = await listUsersForAdmin();

  const staff = users.filter((user) => user.role !== "USER");
  const customers = users.filter((user) => user.role === "USER");

  return (
    <div className="mx-auto max-w-5xl px-5 py-8 sm:px-8 lg:py-10">
      <header>
        <p className="eyebrow">Administration</p>
        <h1 className="mt-2 text-[2rem] leading-[1.1]">People</h1>
        <p className="mt-3 max-w-2xl text-ink-soft">
          {staff.length} staff {staff.length === 1 ? "account" : "accounts"} and{" "}
          {customers.length} {customers.length === 1 ? "customer" : "customers"}.
        </p>
      </header>

      <div className="mt-8">
        <InviteForm />
      </div>

      <section aria-labelledby="staff-heading" className="mt-10">
        <h2 id="staff-heading" className="text-lg text-ink">
          Staff
        </h2>

        <ul className="mt-4 space-y-3">
          {staff.map((user) => {
            const self = user.id === admin.id;

            return (
              <li
                key={user.id}
                className="flex flex-wrap items-center gap-3 rounded-lg border border-line bg-surface-raised p-4"
              >
                <div className="min-w-0 flex-1">
                  <p className="flex flex-wrap items-center gap-2 text-ink">
                    <Link
                      href={`/admin/users/${user.id}`}
                      className="underline decoration-transparent underline-offset-4 transition-colors hover:decoration-ink"
                    >
                      {user.fullName}
                    </Link>
                    <Chip tone={user.role === "ADMIN" ? "brick" : "brass"}>
                      {ROLE_LABEL[user.role]}
                    </Chip>
                    {self ? <Chip tone="neutral">You</Chip> : null}
                    {!user.isActive ? <Chip tone="critical">Disabled</Chip> : null}
                  </p>
                  <p className="mt-0.5 truncate text-[0.875rem] text-ink-muted">
                    {user.email}
                    {user.lastLoginAt
                      ? `, last signed in ${formatInquiryDate(user.lastLoginAt)}`
                      : ", never signed in"}
                  </p>
                </div>

                <p className="text-[0.875rem] tabular-nums text-ink-muted">
                  {user._count.assignedInquiry} assigned
                </p>

                {self ? (
                  <p className="text-[0.875rem] text-ink-muted">
                    You cannot change your own account here.
                  </p>
                ) : (
                  <div className="flex flex-wrap items-center gap-2">
                    <form action={changeRoleAction} className="flex items-center gap-2">
                      <input type="hidden" name="userId" value={user.id} />
                      <label htmlFor={`role-${user.id}`} className="sr-only">
                        Role for {user.fullName}
                      </label>
                      <select
                        id={`role-${user.id}`}
                        name="role"
                        defaultValue={user.role}
                        className="h-8 rounded-sm border border-line-strong bg-surface px-2 text-[0.8125rem]"
                      >
                        <option value="USER">Customer</option>
                        <option value="MANAGER">Manager</option>
                        <option value="ADMIN">Administrator</option>
                      </select>
                      <Button type="submit" size="sm" variant="secondary">
                        Change
                      </Button>
                    </form>

                    <form action={sendStaffResetAction}>
                      <input type="hidden" name="userId" value={user.id} />
                      <Button type="submit" size="sm" variant="ghost">
                        <KeyRound className="size-3.5" aria-hidden="true" />
                        Send a reset link
                      </Button>
                    </form>

                    <form action={toggleUserActiveAction}>
                      <input type="hidden" name="userId" value={user.id} />
                      <Button
                        type="submit"
                        size="sm"
                        variant="ghost"
                        className={user.isActive ? "text-critical hover:text-critical" : undefined}
                      >
                        {user.isActive ? "Disable" : "Enable"}
                      </Button>
                    </form>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      </section>

      <section aria-labelledby="customers-heading" className="mt-12">
        <h2 id="customers-heading" className="text-lg text-ink">
          Customers
        </h2>

        {customers.length === 0 ? (
          <p className="mt-3 text-ink-muted">
            Nobody has registered yet. Inquiries can still be sent without an account.
          </p>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[44rem] border-collapse text-[0.9375rem]">
              <caption className="sr-only">Registered customers</caption>
              <thead>
                <tr className="border-b border-line text-left text-[0.75rem] uppercase tracking-[0.06em] text-ink-muted">
                  <th scope="col" className="py-3 pr-4 font-medium">
                    Name
                  </th>
                  <th scope="col" className="py-3 pr-4 font-medium">
                    Email
                  </th>
                  <th scope="col" className="py-3 pr-4 text-right font-medium">
                    Inquiries
                  </th>
                  <th scope="col" className="py-3 pr-4 font-medium">
                    Joined
                  </th>
                  <th scope="col" className="py-3 font-medium">
                    Account
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-line">
                {customers.map((user) => (
                  <tr key={user.id}>
                    <th scope="row" className="py-3 pr-4 text-left font-normal text-ink">
                      <Link
                        href={`/admin/users/${user.id}`}
                        className="underline decoration-transparent underline-offset-4 transition-colors hover:decoration-ink"
                      >
                        {user.fullName}
                      </Link>
                      {user.companyName ? (
                        <span className="block text-[0.8125rem] text-ink-muted">
                          {user.companyName}
                        </span>
                      ) : null}
                    </th>
                    <td className="py-3 pr-4 text-ink-soft">
                      {user.email}
                      {!user.emailVerifiedAt ? (
                        <span className="ml-2 text-[0.8125rem] text-caution">
                          Not confirmed
                        </span>
                      ) : null}
                    </td>
                    <td className="py-3 pr-4 text-right tabular-nums text-ink-soft">
                      {user._count.inquiries}
                    </td>
                    <td className="py-3 pr-4 text-ink-soft">{formatInquiryDate(user.createdAt)}</td>
                    <td className="py-3">
                      <form action={toggleUserActiveAction}>
                        <input type="hidden" name="userId" value={user.id} />
                        <Button
                          type="submit"
                          size="sm"
                          variant="ghost"
                          className={
                            user.isActive ? "text-critical hover:text-critical" : undefined
                          }
                        >
                          {user.isActive ? "Disable" : "Enable"}
                        </Button>
                      </form>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
