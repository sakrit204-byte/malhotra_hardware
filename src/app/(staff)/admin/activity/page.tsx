import type { Metadata } from "next";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/states";
import { formatInquiryDateTime } from "@/lib/inquiry-status";
import { requireRole } from "@/server/auth/guards";
import { listAuditLog } from "@/server/repositories/admin";

export const metadata: Metadata = {
  title: "Activity",
  robots: { index: false, follow: false },
};

/**
 * The record of who changed what.
 *
 * Every action taken in the administrator platform is written here with the
 * person, the time and the address it came from. Nobody can edit it, including
 * from this screen, because a log that can be tidied up is not a log.
 */
export default async function AdminActivityPage({
  searchParams,
}: PageProps<"/admin/activity">) {
  await requireRole("ADMIN", "/admin/activity");
  const params = await searchParams;
  const page = Number(typeof params.page === "string" ? params.page : 1) || 1;

  const result = await listAuditLog(page);

  return (
    <div className="mx-auto max-w-4xl px-5 py-8 sm:px-8 lg:py-10">
      <header>
        <p className="eyebrow">Administration</p>
        <h1 className="mt-2 text-[2rem] leading-[1.1]">Activity</h1>
        <p className="mt-3 max-w-2xl text-ink-soft">
          Every change made through the manager and administrator platforms, newest first.
          This record cannot be edited.
        </p>
      </header>

      {result.items.length === 0 ? (
        <div className="mt-10">
          <EmptyState
            title="Nothing recorded yet"
            description="Changes made in the administrator platform will appear here."
          />
        </div>
      ) : (
        <ol className="mt-8 space-y-1">
          {result.items.map((entry) => (
            <li
              key={entry.id}
              className="flex flex-wrap items-baseline gap-x-3 gap-y-1 border-b border-line py-3"
            >
              <p className="min-w-0 flex-1 text-[0.9375rem] text-ink">{entry.summary}</p>

              <p className="text-[0.875rem] text-ink-muted">
                {entry.actor?.fullName ?? entry.actorEmail ?? "The system"}
              </p>

              <p className="text-[0.875rem] tabular-nums text-ink-muted">
                {formatInquiryDateTime(entry.createdAt)}
              </p>
            </li>
          ))}
        </ol>
      )}

      {result.pageCount > 1 ? (
        <nav aria-label="Activity pages" className="mt-8 flex items-center justify-center gap-3">
          {result.page > 1 ? (
            <Button asChild variant="secondary" size="sm">
              <Link href={`/admin/activity?page=${result.page - 1}`}>Previous</Link>
            </Button>
          ) : null}

          <span className="text-[0.875rem] tabular-nums text-ink-muted">
            Page {result.page} of {result.pageCount}
          </span>

          {result.page < result.pageCount ? (
            <Button asChild variant="secondary" size="sm">
              <Link href={`/admin/activity?page=${result.page + 1}`}>Next</Link>
            </Button>
          ) : null}
        </nav>
      ) : null}
    </div>
  );
}
