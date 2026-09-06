import type { Metadata } from "next";
import Link from "next/link";
import { Search } from "lucide-react";

import { Chip } from "@/components/ui/chip";
import { EmptyState } from "@/components/ui/states";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/cn";
import {
  formatInquiryDate,
  INQUIRY_STATUSES,
  statusLabel,
  statusTone,
} from "@/lib/inquiry-status";
import { requireRole } from "@/server/auth/guards";
import { listInquiriesForManager } from "@/server/repositories/manager";
import {
  managerListHref,
  MANAGER_SORTS,
  parseManagerQuery,
} from "@/server/validation/manager";

export const metadata: Metadata = {
  title: "Inquiries",
  robots: { index: false, follow: false },
};

/**
 * The inquiry list.
 *
 * A table, because this is the screen a manager scans forty rows of at a time
 * and cards would waste the width. Search covers reference, name, address,
 * phone, company and project, so whichever detail a customer gives on the phone
 * finds them.
 */
export default async function ManagerInquiriesPage({
  searchParams,
}: PageProps<"/manager/inquiries">) {
  const staff = await requireRole("MANAGER", "/manager/inquiries");
  const query = parseManagerQuery(await searchParams, staff.id);

  const result = await listInquiriesForManager(query);

  const filters = [
    { label: "All", href: managerListHref(query, { status: [], assigned: "all", unread: false }), active: query.status.length === 0 && query.assigned === "all" && !query.unread },
    { label: "Unread", href: managerListHref(query, { unread: true }), active: query.unread },
    { label: "Mine", href: managerListHref(query, { assigned: "mine" }), active: query.assigned === "mine" },
    {
      label: "Unassigned",
      href: managerListHref(query, { assigned: "unassigned" }),
      active: query.assigned === "unassigned",
    },
  ];

  return (
    <div className="px-5 py-8 sm:px-8 lg:px-10 lg:py-10">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow">Inquiries</p>
          <h1 className="mt-2 text-[2rem] leading-[1.1]">
            {result.total} {result.total === 1 ? "inquiry" : "inquiries"}
          </h1>
        </div>

        <form action="/manager/inquiries" className="flex gap-2" role="search">
          {query.status.map((status) => (
            <input key={status} type="hidden" name="status" value={status} />
          ))}
          {query.assigned !== "all" ? (
            <input type="hidden" name="assigned" value={query.assigned} />
          ) : null}

          <div className="relative">
            <label htmlFor="manager-search" className="sr-only">
              Search inquiries
            </label>
            <Search
              className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink-muted"
              aria-hidden="true"
            />
            <input
              id="manager-search"
              name="q"
              type="search"
              defaultValue={query.q ?? ""}
              placeholder="Reference, name, email or project"
              className="h-10 w-72 rounded-md border border-line-strong bg-surface-raised pl-9 pr-3 text-[0.9375rem] hover:border-ink-muted"
            />
          </div>
          <Button type="submit" variant="secondary">
            Search
          </Button>
        </form>
      </header>

      {/* --------------------------------------------------------- filters */}
      <div className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-3 border-b border-line pb-4">
        <ul className="flex flex-wrap gap-1">
          {filters.map((filter) => (
            <li key={filter.label}>
              <Link
                href={filter.href}
                aria-current={filter.active ? "true" : undefined}
                className={cn(
                  "rounded-md px-3 py-1.5 text-[0.875rem] transition-colors",
                  filter.active
                    ? "bg-ink text-ink-inverse"
                    : "text-ink-soft hover:bg-surface-sunken hover:text-ink",
                )}
              >
                {filter.label}
              </Link>
            </li>
          ))}
        </ul>

        <ul className="flex flex-wrap gap-1">
          {INQUIRY_STATUSES.map((status) => {
            const active = query.status.includes(status);

            return (
              <li key={status}>
                <Link
                  href={managerListHref(query, {
                    status: active
                      ? query.status.filter((entry) => entry !== status)
                      : [...query.status, status],
                  })}
                  aria-pressed={active}
                  className={cn(
                    "rounded-md border px-2.5 py-1.5 text-[0.8125rem] transition-colors",
                    active
                      ? "border-ink bg-surface-sunken text-ink"
                      : "border-line text-ink-soft hover:border-line-strong hover:text-ink",
                  )}
                >
                  {statusLabel(status)}
                </Link>
              </li>
            );
          })}
        </ul>

        <form action="/manager/inquiries" className="ml-auto">
          {query.q ? <input type="hidden" name="q" value={query.q} /> : null}
          {query.status.map((status) => (
            <input key={status} type="hidden" name="status" value={status} />
          ))}
          {query.assigned !== "all" ? (
            <input type="hidden" name="assigned" value={query.assigned} />
          ) : null}
          {query.unread ? <input type="hidden" name="unread" value="1" /> : null}

          <label htmlFor="manager-sort" className="sr-only">
            Sort inquiries
          </label>
          <select
            id="manager-sort"
            name="sort"
            defaultValue={query.sort}
            className="h-9 rounded-md border border-line-strong bg-surface-raised px-2.5 text-[0.875rem]"
          >
            {MANAGER_SORTS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <noscript>
            <button type="submit" className="ml-2 text-[0.875rem] underline">
              Apply
            </button>
          </noscript>
        </form>
      </div>

      {/* ----------------------------------------------------------- table */}
      {result.items.length === 0 ? (
        <div className="mt-10">
          <EmptyState
            title="Nothing here"
            description="No inquiry matches these filters. Clear them to see everything."
            action={
              <Button asChild variant="secondary">
                <Link href="/manager/inquiries">Clear filters</Link>
              </Button>
            }
          />
        </div>
      ) : (
        <div className="mt-2 overflow-x-auto">
          <table className="w-full min-w-[56rem] border-collapse text-[0.9375rem]">
            <caption className="sr-only">Customer inquiries</caption>
            <thead>
              <tr className="border-b border-line text-left text-[0.75rem] uppercase tracking-[0.06em] text-ink-muted">
                <th scope="col" className="py-3 pr-4 font-medium">
                  Reference
                </th>
                <th scope="col" className="py-3 pr-4 font-medium">
                  Customer
                </th>
                <th scope="col" className="py-3 pr-4 font-medium">
                  Project
                </th>
                <th scope="col" className="py-3 pr-4 text-right font-medium">
                  Items
                </th>
                <th scope="col" className="py-3 pr-4 text-right font-medium">
                  Estimate
                </th>
                <th scope="col" className="py-3 pr-4 font-medium">
                  Status
                </th>
                <th scope="col" className="py-3 pr-4 font-medium">
                  Owner
                </th>
                <th scope="col" className="py-3 font-medium">
                  Activity
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-line">
              {result.items.map((inquiry) => (
                <tr
                  key={inquiry.id}
                  className={cn(
                    "transition-colors hover:bg-surface-sunken",
                    inquiry.unreadForManager && "bg-brick-wash/40",
                  )}
                >
                  <th scope="row" className="py-3 pr-4 text-left font-normal">
                    <Link
                      href={`/manager/inquiries/${inquiry.id}`}
                      className="flex items-center gap-2 font-display tracking-wide text-ink"
                    >
                      {inquiry.unreadForManager ? (
                        <span
                          className="size-1.5 shrink-0 rounded-full bg-brick"
                          aria-label="Unread"
                        />
                      ) : null}
                      {inquiry.reference}
                    </Link>
                  </th>
                  <td className="py-3 pr-4">
                    <span className="block text-ink">{inquiry.fullName}</span>
                    <span className="block text-[0.8125rem] text-ink-muted">
                      {inquiry.email}
                    </span>
                  </td>
                  <td className="py-3 pr-4 text-ink-soft">
                    {inquiry.projectName ?? inquiry.companyName ?? "Not given"}
                  </td>
                  <td className="py-3 pr-4 text-right tabular-nums text-ink-soft">
                    {inquiry.itemCount}
                  </td>
                  <td className="py-3 pr-4">
                    <Chip tone={statusTone(inquiry.status)}>
                      {statusLabel(inquiry.status)}
                    </Chip>
                  </td>
                  <td className="py-3 pr-4 text-[0.875rem] text-ink-soft">
                    {inquiry.manager?.fullName ?? "Nobody"}
                  </td>
                  <td className="py-3 text-[0.875rem] text-ink-muted">
                    {formatInquiryDate(inquiry.lastActivityAt)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ------------------------------------------------------ pagination */}
      {result.pageCount > 1 ? (
        <nav
          aria-label="Inquiry pages"
          className="mt-8 flex items-center justify-center gap-2"
        >
          {result.page > 1 ? (
            <Button asChild variant="secondary" size="sm">
              <Link href={managerListHref(query, { page: result.page - 1 })}>Previous</Link>
            </Button>
          ) : null}

          <span className="px-3 text-[0.875rem] tabular-nums text-ink-muted">
            Page {result.page} of {result.pageCount}
          </span>

          {result.page < result.pageCount ? (
            <Button asChild variant="secondary" size="sm">
              <Link href={managerListHref(query, { page: result.page + 1 })}>Next</Link>
            </Button>
          ) : null}
        </nav>
      ) : null}
    </div>
  );
}
