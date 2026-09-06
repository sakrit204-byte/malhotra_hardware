import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { BarSeries, Figure, Panel, RankedRows } from "@/components/staff/charts";
import { Button } from "@/components/ui/button";
import { statusLabel } from "@/lib/inquiry-status";
import { requireRole } from "@/server/auth/guards";
import { listAuditLog } from "@/server/repositories/admin";
import {
  getCatalogueHealth,
  getDemandByCategory,
  getDemandByProduct,
  getRequestedPieces,
  getInquiryPosition,
  getInquiryTrend,
  getManagerLoad,
  getPeopleGrowth,
  getResponseTimes,
} from "@/server/repositories/insights";

export const metadata: Metadata = {
  title: "Administration",
  robots: { index: false, follow: false },
};

/**
 * The administrator dashboard.
 *
 * It answers the questions somebody running the shop actually asks on a Monday
 * morning: is work coming in, are we answering it, what are people asking for,
 * and what is wrong with the catalogue. Every number is a link to the screen
 * where something can be done about it, because a figure you cannot act on is
 * decoration.
 */
export default async function AdminOverviewPage() {
  await requireRole("ADMIN", "/admin");

  const [
    trend,
    position,
    response,
    demand,
    categories,
    health,
    people,
    demandSize,
    load,
    activity,
  ] = await Promise.all([
    getInquiryTrend(12),
    getInquiryPosition(),
    getResponseTimes(90),
    getDemandByProduct(90, 8),
    getDemandByCategory(90, 6),
    getCatalogueHealth(),
    getPeopleGrowth(),
    getRequestedPieces(30),
    getManagerLoad(),
    listAuditLog(1),
  ]);

  // The last four weeks against the four before them, which is the comparison
  // a month of trading is actually judged by.
  const recent = trend.slice(-4).reduce((sum, point) => sum + point.inquiries, 0);
  const earlier = trend.slice(-8, -4).reduce((sum, point) => sum + point.inquiries, 0);

  const chartBars = trend.map((point, index) => ({
    label: point.start.toLocaleDateString("en-GB", { day: "numeric", month: "short" }),
    value: point.inquiries,
    caption:
      index % 2 === 0
        ? point.start.toLocaleDateString("en-GB", { day: "numeric", month: "short" })
        : "",
    highlight: index === trend.length - 1,
  }));

  const jobs = [
    {
      label: "Waiting for a reply",
      count: position.waiting,
      href: "/manager/inquiries?unread=1",
    },
    {
      label: "Nobody assigned",
      count: position.unassigned,
      href: "/manager/inquiries?assigned=none",
    },
    {
      label: "Quiet for three days",
      count: position.overdue,
      href: "/manager/inquiries",
    },
    {
      label: "Products not published",
      count: health.drafts,
      href: "/admin/products?published=draft",
    },
    {
      label: "Published with no photograph",
      count: health.unphotographed,
      href: "/admin/products?health=unphotographed",
    },
    {
      label: "Out of stock on the site",
      count: health.outOfStock,
      href: "/admin/products?health=outOfStock",
    },
    {
      label: "Categories with nothing in them",
      count: health.emptyCategories,
      href: "/admin/categories",
    },
    {
      label: "Customers who never confirmed",
      count: people.unverified,
      href: "/admin/users",
    },
  ].filter((job) => job.count > 0);

  return (
    <div className="px-5 py-8 sm:px-8 lg:px-10 lg:py-10">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="note">Administration</p>
          <h1 className="mt-3 text-[2.5rem] leading-[1.05]">The last ninety days</h1>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button asChild variant="secondary">
            <Link href="/admin/home">Home page</Link>
          </Button>
          <Button asChild>
            <Link href="/admin/products">Catalogue</Link>
          </Button>
        </div>
      </header>

      {/* ------------------------------------------------- headline figures */}
      <div className="mt-10 grid gap-6 sm:grid-cols-2 xl:grid-cols-4">
        <Figure
          label="Inquiries, four weeks"
          value={String(recent)}
          caption={`${earlier} in the four before`}
          delta={{ value: recent - earlier }}
        />
        <Figure
          label="Pieces asked for, thirty days"
          value={String(demandSize.pieces)}
          caption={`across ${demandSize.inquiries} ${
            demandSize.inquiries === 1 ? "inquiry" : "inquiries"
          }`}
        />
        <Figure
          label="First reply, average"
          value={
            response.averageHours === null
              ? "No replies yet"
              : response.averageHours < 1
                ? "Under an hour"
                : `${response.averageHours.toFixed(1)} hours`
          }
          caption={`${response.replied} answered, ${response.unanswered} still open`}
          tone={response.unanswered > 0 ? "warn" : "neutral"}
        />
        <Figure
          label="Waiting on us now"
          value={String(position.waiting)}
          caption={`${position.unassigned} with nobody assigned`}
          tone="warn"
        />
      </div>

      {/* ----------------------------------------------------- trend and jobs */}
      <div className="mt-12 grid gap-10 xl:grid-cols-[1.6fr_1fr]">
        <Panel
          title="Inquiries by week"
          note="Twelve weeks"
          action={
            <Button asChild variant="quiet" size="sm">
              <Link href="/manager/inquiries">
                Open the list
                <ArrowRight className="size-3.5" aria-hidden="true" />
              </Link>
            </Button>
          }
        >
          <BarSeries
            bars={chartBars}
            summary={`Inquiries received in each of the last ${trend.length} weeks`}
          />
        </Panel>

        <Panel title="Needs somebody" note={`${jobs.length} open`}>
          {jobs.length === 0 ? (
            <p className="text-[0.9375rem] text-ink-muted">
              Nothing is waiting. Every inquiry has been answered and the catalogue is
              complete.
            </p>
          ) : (
            <ul className="divide-y divide-line border-y border-line">
              {jobs.map((job) => (
                <li key={job.label}>
                  <Link
                    href={job.href}
                    className="group flex items-baseline gap-3 py-2.5 transition-colors hover:text-ink"
                  >
                    <span className="figure w-8 shrink-0 text-ink">{job.count}</span>
                    <span className="min-w-0 flex-1 text-[0.9375rem] text-ink-soft group-hover:text-ink">
                      {job.label}
                    </span>
                    <ArrowRight
                      className="size-3.5 shrink-0 text-ink-muted transition-transform group-hover:translate-x-0.5"
                      aria-hidden="true"
                    />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>

      {/* --------------------------------------------------------- demand */}
      <div className="mt-12 grid gap-10 lg:grid-cols-2">
        <Panel title="Asked about most" note="Ninety days">
          <RankedRows
            summary="Products by number of inquiries in the last ninety days"
            rows={demand.map((row) => ({
              key: row.productCode,
              label: row.slug ? (
                <Link
                  href={`/admin/products?q=${encodeURIComponent(row.productCode)}`}
                  className="underline decoration-transparent underline-offset-4 hover:decoration-ink"
                >
                  {row.productName}
                </Link>
              ) : (
                row.productName
              ),
              value: row.inquiries,
              note: `${row.quantity} pieces`,
            }))}
          />
        </Panel>

        <Panel title="Where the demand sits" note="Ninety days">
          <RankedRows
            summary="Categories by number of inquiries in the last ninety days"
            rows={categories.map((row) => ({
              key: row.slug,
              label: (
                <Link
                  href={`/products?category=${row.slug}`}
                  className="underline decoration-transparent underline-offset-4 hover:decoration-ink"
                >
                  {row.name}
                </Link>
              ),
              value: row.inquiries,
              note: `${row.quantity} pieces`,
            }))}
          />
        </Panel>
      </div>

      {/* ------------------------------------------------ status and people */}
      <div className="mt-12 grid gap-10 lg:grid-cols-3">
        <Panel title="Every inquiry by status">
          <RankedRows
            summary="Inquiries grouped by status"
            rows={position.byStatus.map((row) => ({
              key: row.status,
              label: statusLabel(row.status),
              value: row.count,
            }))}
          />
        </Panel>

        <Panel title="Who is carrying what">
          <RankedRows
            summary="Open inquiries assigned to each member of staff"
            rows={load.map((manager) => ({
              key: manager.id,
              label: manager.fullName,
              value: manager.open,
              note: manager.waiting > 0 ? `${manager.waiting} waiting` : undefined,
            }))}
          />
        </Panel>

        <Panel title="The catalogue">
          <dl className="divide-y divide-line border-y border-line">
            {[
              { label: "Products", value: health.total, href: "/admin/products" },
              {
                label: "Published",
                value: health.total - health.drafts,
                href: "/admin/products?published=published",
              },
              { label: "Customers", value: people.customers, href: "/admin/users" },
              {
                label: "New this month",
                value: people.thisMonth,
                href: "/admin/users",
              },
            ].map((row) => (
              <div key={row.label} className="flex items-baseline gap-3 py-2.5">
                <dt className="min-w-0 flex-1 text-[0.9375rem] text-ink-soft">
                  <Link
                    href={row.href}
                    className="underline decoration-transparent underline-offset-4 hover:decoration-ink"
                  >
                    {row.label}
                  </Link>
                </dt>
                <dd className="figure text-ink">{row.value}</dd>
              </div>
            ))}
          </dl>
        </Panel>
      </div>

      {/* ------------------------------------------------------- activity */}
      <div className="mt-12">
        <Panel
          title="Latest changes"
          action={
            <Button asChild variant="quiet" size="sm">
              <Link href="/admin/activity">
                Everything
                <ArrowRight className="size-3.5" aria-hidden="true" />
              </Link>
            </Button>
          }
        >
          <ul className="divide-y divide-line border-y border-line">
            {activity.items.slice(0, 6).map((entry) => (
              <li key={entry.id} className="flex flex-wrap items-baseline gap-x-3 py-2.5">
                <span className="min-w-0 flex-1 text-[0.9375rem] text-ink">
                  {entry.summary}
                </span>
                <span className="note">
                  {entry.actor?.fullName ?? entry.actorEmail ?? "The system"}
                </span>
              </li>
            ))}
          </ul>
        </Panel>
      </div>
    </div>
  );
}
