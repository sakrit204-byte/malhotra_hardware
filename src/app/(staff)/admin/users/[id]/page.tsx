import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, KeyRound, Mail, Phone } from "lucide-react";

import { Panel } from "@/components/staff/charts";
import { Button } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";
import {
  formatInquiryDate,
  formatInquiryDateTime,
  statusLabel,
  statusTone,
} from "@/lib/inquiry-status";
import {
  changeRoleAction,
  sendStaffResetAction,
  toggleUserActiveAction,
} from "@/server/actions/admin-people";
import { requireRole } from "@/server/auth/guards";
import { getUserForAdmin } from "@/server/repositories/admin";

export const metadata: Metadata = {
  title: "Person",
  robots: { index: false, follow: false },
};

const ROLE_LABEL: Record<string, string> = {
  ADMIN: "Administrator",
  MANAGER: "Manager",
  USER: "Customer",
};

/**
 * One person.
 *
 * Everything needed to answer a telephone call from them: what they have asked
 * for, what state their account is in, and what has been done to it. The two
 * safeguards from the list are here too, spelled out rather than hidden: nobody
 * edits their own account, and the last administrator cannot be removed.
 */
export default async function AdminUserPage({ params }: PageProps<"/admin/users/[id]">) {
  const { id } = await params;
  const admin = await requireRole("ADMIN", `/admin/users/${id}`);

  const person = await getUserForAdmin(id);
  if (!person) notFound();

  const self = person.id === admin.id;
  const staff = person.role !== "USER";

  return (
    <div className="mx-auto max-w-5xl px-5 py-8 sm:px-8 lg:py-10">
      <Link
        href="/admin/users"
        className="note inline-flex items-center gap-1.5 hover:text-ink"
      >
        <ArrowLeft className="size-3.5" aria-hidden="true" />
        Everybody
      </Link>

      <header className="mt-4 flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="note flex flex-wrap items-center gap-2">
            {ROLE_LABEL[person.role]}
            {self ? <Chip tone="neutral">You</Chip> : null}
            {!person.isActive ? <Chip tone="critical">Disabled</Chip> : null}
            {!person.emailVerifiedAt ? <Chip tone="caution">Not confirmed</Chip> : null}
          </p>
          <h1 className="mt-3 text-[2.5rem] leading-[1.05]">{person.fullName}</h1>
          {person.companyName ? (
            <p className="mt-2 text-ink-soft">{person.companyName}</p>
          ) : null}
        </div>

        <dl className="grid grid-cols-2 gap-x-8 gap-y-3 text-[0.875rem]">
          <div>
            <dt className="note">Inquiries</dt>
            <dd className="figure mt-1 text-ink">{person._count.inquiries}</dd>
          </div>
          <div>
            <dt className="note">Pieces asked for</dt>
            <dd className="figure mt-1 text-ink">{person.piecesRequested}</dd>
          </div>
        </dl>
      </header>

      {/* ------------------------------------------------------ how to reach */}
      <div className="mt-10 grid gap-10 lg:grid-cols-[1.4fr_1fr]">
        <Panel title="How to reach them">
          <ul className="divide-y divide-line border-y border-line">
            <li className="flex items-center gap-3 py-2.5">
              <Mail className="size-4 shrink-0 text-ink-muted" aria-hidden="true" />
              <a
                href={`mailto:${person.email}`}
                className="figure text-ink underline decoration-line-strong underline-offset-4 hover:decoration-ink"
              >
                {person.email}
              </a>
            </li>
            {person.phone ? (
              <li className="flex items-center gap-3 py-2.5">
                <Phone className="size-4 shrink-0 text-ink-muted" aria-hidden="true" />
                <a
                  href={`tel:${person.phone.replace(/\s+/g, "")}`}
                  className="figure text-ink underline decoration-line-strong underline-offset-4 hover:decoration-ink"
                >
                  {person.phone}
                </a>
              </li>
            ) : null}
          </ul>

          <dl className="mt-6 grid grid-cols-2 gap-4 text-[0.875rem] sm:grid-cols-3">
            <div>
              <dt className="note">Joined</dt>
              <dd className="mt-1 text-ink-soft">{formatInquiryDate(person.createdAt)}</dd>
            </div>
            <div>
              <dt className="note">Last signed in</dt>
              <dd className="mt-1 text-ink-soft">
                {person.lastLoginAt ? formatInquiryDate(person.lastLoginAt) : "Never"}
              </dd>
            </div>
            <div>
              <dt className="note">Open sessions</dt>
              <dd className="mt-1 text-ink-soft">{person.sessions.length}</dd>
            </div>
          </dl>
        </Panel>

        {/* ------------------------------------------------------- the account */}
        <Panel title="The account">
          {self ? (
            <p className="text-[0.9375rem] text-ink-muted">
              This is your own account. Nobody can change their own role or disable
              themselves here, which is what stops one careless press locking the last
              administrator out.
            </p>
          ) : (
            <div className="space-y-5">
              <form action={changeRoleAction} className="flex flex-wrap items-end gap-2">
                <input type="hidden" name="userId" value={person.id} />
                <label className="flex-1">
                  <span className="note block">Role</span>
                  <select
                    name="role"
                    defaultValue={person.role}
                    className="mt-1.5 h-9 w-full border border-line-strong bg-surface px-2 text-[0.875rem]"
                  >
                    <option value="USER">Customer</option>
                    <option value="MANAGER">Manager</option>
                    <option value="ADMIN">Administrator</option>
                  </select>
                </label>
                <Button type="submit" size="sm" variant="secondary">
                  Change
                </Button>
              </form>

              <p className="text-[0.8125rem] text-ink-muted">
                Changing a role ends every session that person has open, so they sign in
                again under the new one.
              </p>

              <div className="flex flex-wrap gap-2 border-t border-line pt-4">
                <form action={sendStaffResetAction}>
                  <input type="hidden" name="userId" value={person.id} />
                  <Button type="submit" size="sm" variant="secondary">
                    <KeyRound className="size-3.5" aria-hidden="true" />
                    Send a reset link
                  </Button>
                </form>

                <form action={toggleUserActiveAction}>
                  <input type="hidden" name="userId" value={person.id} />
                  <Button
                    type="submit"
                    size="sm"
                    variant={person.isActive ? "danger" : "primary"}
                  >
                    {person.isActive ? "Disable this account" : "Enable this account"}
                  </Button>
                </form>
              </div>
            </div>
          )}
        </Panel>
      </div>

      {/* ---------------------------------------------------------- inquiries */}
      <div className="mt-12">
        <Panel
          title={staff ? "Assigned to them" : "What they have asked for"}
          note={`${person._count.inquiries} in total`}
        >
          {staff ? (
            person.assignedInquiry.length === 0 ? (
              <p className="text-[0.9375rem] text-ink-muted">
                Nothing open is assigned to them at the moment.
              </p>
            ) : (
              <ul className="divide-y divide-line border-y border-line">
                {person.assignedInquiry.map((inquiry) => (
                  <li key={inquiry.id}>
                    <Link
                      href={`/manager/inquiries/${inquiry.id}`}
                      className="flex flex-wrap items-baseline gap-x-4 py-2.5 hover:text-ink"
                    >
                      <span className="figure text-ink">{inquiry.reference}</span>
                      <span className="min-w-0 flex-1 truncate text-[0.9375rem] text-ink-soft">
                        {inquiry.fullName}
                      </span>
                      <Chip tone={statusTone(inquiry.status)}>
                        {statusLabel(inquiry.status)}
                      </Chip>
                      <span className="note">
                        {formatInquiryDate(inquiry.lastActivityAt)}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )
          ) : person.inquiries.length === 0 && person.guestInquiries.length === 0 ? (
            <p className="text-[0.9375rem] text-ink-muted">
              They have an account but have never sent an inquiry.
            </p>
          ) : (
            <ul className="divide-y divide-line border-y border-line">
              {[
                ...person.inquiries.map((inquiry) => ({ ...inquiry, guest: false })),
                ...person.guestInquiries.map((inquiry) => ({
                  ...inquiry,
                  guest: true,
                  lastActivityAt: inquiry.createdAt,
                  unreadForManager: false,
                })),
              ].map((inquiry) => (
                <li key={inquiry.id}>
                  <Link
                    href={`/manager/inquiries/${inquiry.id}`}
                    className="flex flex-wrap items-baseline gap-x-4 gap-y-1 py-2.5 hover:text-ink"
                  >
                    <span className="figure text-ink">{inquiry.reference}</span>
                    <span className="note w-24 shrink-0">
                      {formatInquiryDate(inquiry.createdAt)}
                    </span>
                    <span className="min-w-0 flex-1 text-[0.9375rem] text-ink-soft">
                      {inquiry.itemCount} {inquiry.itemCount === 1 ? "item" : "items"}
                    </span>
                    {inquiry.guest ? <Chip tone="neutral">Sent as a guest</Chip> : null}
                    <Chip tone={statusTone(inquiry.status)}>
                      {statusLabel(inquiry.status)}
                    </Chip>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>

      {/* ----------------------------------------------------------- activity */}
      {person.activity.length > 0 ? (
        <div className="mt-12">
          <Panel title="What has happened to this account">
            <ul className="divide-y divide-line border-y border-line">
              {person.activity.map((entry) => (
                <li key={entry.id} className="flex flex-wrap items-baseline gap-x-3 py-2.5">
                  <span className="min-w-0 flex-1 text-[0.9375rem] text-ink">
                    {entry.summary}
                  </span>
                  <span className="note">{formatInquiryDateTime(entry.createdAt)}</span>
                </li>
              ))}
            </ul>
          </Panel>
        </div>
      ) : null}
    </div>
  );
}
