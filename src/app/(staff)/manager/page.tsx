import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { Chip } from "@/components/ui/chip";
import {
  formatInquiryDateTime,
  INQUIRY_STATUSES,
  statusLabel,
  statusTone,
} from "@/lib/inquiry-status";
import { requireRole } from "@/server/auth/guards";
import { getDashboardCounts, getDashboardSummary } from "@/server/repositories/manager";
import { managerListHref, managerQuerySchema } from "@/server/validation/manager";

export const metadata: Metadata = {
  title: "Dashboard",
  robots: { index: false, follow: false },
};

/**
 * The manager dashboard.
 *
 * Every figure is a link into the list already filtered, because a number a
 * manager cannot act on is decoration. The three at the top are the ones that
 * decide what to do next: what is waiting on us, what nobody has picked up, and
 * what has gone unread.
 */
export default async function ManagerDashboardPage() {
  const staff = await requireRole("MANAGER", "/manager");
  const base = managerQuerySchema.parse({});

  const [counts, summary] = await Promise.all([
    getDashboardCounts(),
    getDashboardSummary(),
  ]);

  const headline = [
    {
      label: "Waiting on us",
      value: summary.awaitingUs,
      href: managerListHref(base, {
        status: ["NEW", "UNDER_REVIEW", "CUSTOMER_RESPONDED"],
      }),
      tone: "brick" as const,
    },
    {
      label: "Unread",
      value: summary.unread,
      href: managerListHref(base, { unread: true }),
      tone: "caution" as const,
    },
    {
      label: "Nobody assigned",
      value: summary.unassigned,
      href: managerListHref(base, { assigned: "unassigned" }),
      tone: "neutral" as const,
    },
  ];

  return (
    <div className="px-5 py-8 sm:px-8 lg:px-10 lg:py-10">
      <header>
        <p className="eyebrow">Dashboard</p>
        <h1 className="mt-2 text-[2rem] leading-[1.1]">
          Good to see you, {staff.fullName.split(" ")[0]}
        </h1>
        <p className="mt-2 text-ink-soft">
          {counts.total} {counts.total === 1 ? "inquiry" : "inquiries"} in total.
        </p>
      </header>

      {/* ------------------------------------------------------- headline */}
      <ul className="mt-8 grid gap-4 sm:grid-cols-3">
        {headline.map((card) => (
          <li key={card.label}>
            <Link
              href={card.href}
              className="group block rounded-lg border border-line bg-surface-raised p-5 transition-colors hover:border-line-strong"
            >
              <p className="text-[0.8125rem] uppercase tracking-[0.08em] text-ink-muted">
                {card.label}
              </p>
              <p className="mt-3 font-display text-[2.5rem] leading-none tabular-nums text-ink">
                {card.value}
              </p>
              <p className="mt-3 inline-flex items-center gap-1 text-[0.875rem] text-ink-soft">
                Open the list
                <ArrowRight
                  className="size-3.5 transition-transform duration-[--duration-quick] group-hover:translate-x-0.5"
                  aria-hidden="true"
                />
              </p>
            </Link>
          </li>
        ))}
      </ul>

      {/* ------------------------------------------------ every status */}
      <section className="mt-10" aria-labelledby="by-status">
        <h2 id="by-status" className="eyebrow">
          By status
        </h2>

        <ul className="mt-4 flex flex-wrap gap-2">
          {INQUIRY_STATUSES.map((status) => (
            <li key={status}>
              <Link
                href={managerListHref(base, { status: [status] })}
                className="inline-flex items-center gap-2 rounded-md border border-line bg-surface-raised px-3 py-2 text-[0.875rem] transition-colors hover:border-line-strong"
              >
                <span className="text-ink-soft">{statusLabel(status)}</span>
                <span className="tabular-nums text-ink">{counts[status]}</span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <div className="mt-10 grid gap-8 lg:grid-cols-2">
        {/* ------------------------------------------------ recent */}
        <section aria-labelledby="recent">
          <div className="flex items-baseline justify-between gap-4">
            <h2 id="recent" className="text-xl">
              Recent inquiries
            </h2>
            <Link
              href="/manager/inquiries"
              className="text-[0.875rem] text-ink-soft underline underline-offset-4 hover:text-ink"
            >
              See all
            </Link>
          </div>

          <ul className="mt-4 divide-y divide-line rounded-lg border border-line bg-surface-raised">
            {summary.recent.map((inquiry) => (
              <li key={inquiry.id}>
                <Link
                  href={`/manager/inquiries/${inquiry.id}`}
                  className="flex flex-wrap items-center gap-3 px-4 py-3.5 transition-colors hover:bg-surface-sunken"
                >
                  <div className="min-w-0 flex-1">
                    <p className="flex items-center gap-2 font-display text-[1.0625rem] tracking-wide text-ink">
                      {inquiry.reference}
                      {inquiry.unreadForManager ? (
                        <span
                          className="size-1.5 rounded-full bg-brick"
                          aria-label="Unread"
                        />
                      ) : null}
                    </p>
                    <p className="mt-0.5 truncate text-[0.875rem] text-ink-muted">
                      {inquiry.fullName}
                      {inquiry.projectName ? `, ${inquiry.projectName}` : ""}
                    </p>
                  </div>

                  <div className="flex shrink-0 items-center gap-3">
                    <Chip tone={statusTone(inquiry.status)}>
                      {statusLabel(inquiry.status)}
                    </Chip>
                  </div>
                </Link>
              </li>
            ))}

            {summary.recent.length === 0 ? (
              <li className="px-4 py-8 text-center text-[0.9375rem] text-ink-muted">
                No inquiries yet.
              </li>
            ) : null}
          </ul>
        </section>

        {/* ------------------------------------------------ activity */}
        <section aria-labelledby="activity">
          <h2 id="activity" className="text-xl">
            Latest messages
          </h2>

          <ul className="mt-4 divide-y divide-line rounded-lg border border-line bg-surface-raised">
            {summary.activity.map((message) => (
              <li key={message.id}>
                <Link
                  href={`/manager/inquiries/${message.inquiry.id}`}
                  className="block px-4 py-3.5 transition-colors hover:bg-surface-sunken"
                >
                  <p className="flex flex-wrap items-baseline gap-x-2 text-[0.875rem]">
                    <span className="font-medium text-ink">
                      {message.senderType === "CUSTOMER" ? message.senderName : "We"}
                    </span>
                    <span className="text-ink-muted">
                      on {message.inquiry.reference}
                    </span>
                    <span className="ml-auto text-[0.8125rem] text-ink-muted">
                      {formatInquiryDateTime(message.createdAt)}
                    </span>
                  </p>
                  <p className="mt-1 line-clamp-2 text-[0.875rem] leading-relaxed text-ink-soft">
                    {message.body}
                  </p>
                </Link>
              </li>
            ))}

            {summary.activity.length === 0 ? (
              <li className="px-4 py-8 text-center text-[0.9375rem] text-ink-muted">
                No messages yet.
              </li>
            ) : null}
          </ul>
        </section>
      </div>
    </div>
  );
}
