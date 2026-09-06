import "server-only";

import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/server/db/prisma";

/**
 * What the business actually wants to know.
 *
 * The administrator platform is where the shop is run from, so this is the
 * difference between a screen that counts rows and one that answers a question.
 * Every figure here comes from the same tables the rest of the site reads, so
 * nothing can drift out of step with what a customer sees.
 *
 * Two rules held throughout. Demand is measured from inquiry items rather than
 * from page views, because an inquiry is a person asking to buy and a view is
 * not. And every window is stated in the query rather than assumed, so a number
 * on the screen can always be traced back to a period.
 */

const DAY = 24 * 60 * 60 * 1000;

function daysAgo(days: number): Date {
  return new Date(Date.now() - days * DAY);
}

/** Monday of the week a date falls in, in the server's own zone. */
function weekStart(date: Date): Date {
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);
  // getDay is Sunday based; shift so a week begins on Monday.
  const offset = (start.getDay() + 6) % 7;
  start.setDate(start.getDate() - offset);
  return start;
}

export type TrendPoint = { start: Date; inquiries: number };

/**
 * Inquiries per week.
 *
 * Gaps are filled in here rather than in SQL. A week with no inquiries is a
 * fact worth drawing, and a chart that silently skips it tells a nicer story
 * than the truth.
 */
export async function getInquiryTrend(weeks = 12): Promise<TrendPoint[]> {
  // Counted back from the week in progress, so the last bar is always the one
  // we are living in. Counting forward from a date this many days ago lands
  // short and quietly drops the current week off the end.
  const current = weekStart(new Date());
  const since = new Date(current.getTime() - (weeks - 1) * 7 * DAY);

  const rows = await prisma.inquiry.findMany({
    where: { createdAt: { gte: since } },
    select: { createdAt: true },
  });

  const buckets = new Map<number, { inquiries: number }>();

  for (let index = 0; index < weeks; index += 1) {
    const start = weekStart(new Date(since.getTime() + index * 7 * DAY));
    buckets.set(start.getTime(), { inquiries: 0 });
  }

  for (const row of rows) {
    const key = weekStart(row.createdAt).getTime();
    const bucket = buckets.get(key);
    if (!bucket) continue;

    bucket.inquiries += 1;
  }

  return [...buckets.entries()]
    .sort(([a], [b]) => a - b)
    .map(([start, bucket]) => ({ start: new Date(start), ...bucket }));
}

/** How the open work is distributed, and how much of it is waiting on us. */
export async function getInquiryPosition() {
  const [byStatus, waiting, unassigned, overdue] = await Promise.all([
    prisma.inquiry.groupBy({ by: ["status"], _count: { _all: true } }),
    prisma.inquiry.count({ where: { unreadForManager: true } }),
    prisma.inquiry.count({
      where: { assignedManagerId: null, status: { notIn: ["CLOSED", "COMPLETED"] } },
    }),
    // Anything open that nobody has touched for three working days.
    prisma.inquiry.count({
      where: {
        status: { notIn: ["CLOSED", "COMPLETED"] },
        lastActivityAt: { lt: daysAgo(3) },
      },
    }),
  ]);

  return {
    byStatus: byStatus.map((row) => ({ status: row.status, count: row._count._all })),
    waiting,
    unassigned,
    overdue,
  };
}

/**
 * How long a customer waits for a first human reply.
 *
 * Measured to the first message a manager sends that is not an internal note,
 * because a note is not an answer. Inquiries with no reply yet are counted
 * separately rather than folded into the average, which would flatter it.
 */
export async function getResponseTimes(days = 90) {
  const rows = await prisma.$queryRaw<
    Array<{ hours: number | null; replied: bigint; unanswered: bigint }>
  >(Prisma.sql`
    WITH first_reply AS (
      SELECT
        i.id,
        MIN(m."createdAt") FILTER (
          WHERE m."senderType" = 'MANAGER' AND m."isInternalNote" = false
        ) AS replied_at,
        i."createdAt" AS asked_at
      FROM inquiries i
      LEFT JOIN inquiry_messages m ON m."inquiryId" = i.id
      WHERE i."createdAt" >= ${daysAgo(days)}
      GROUP BY i.id, i."createdAt"
    )
    SELECT
      AVG(EXTRACT(EPOCH FROM (replied_at - asked_at)) / 3600)
        FILTER (WHERE replied_at IS NOT NULL) AS hours,
      COUNT(*) FILTER (WHERE replied_at IS NOT NULL) AS replied,
      COUNT(*) FILTER (WHERE replied_at IS NULL) AS unanswered
    FROM first_reply
  `);

  const row = rows[0];

  return {
    averageHours: row?.hours === null || row?.hours === undefined ? null : Number(row.hours),
    replied: Number(row?.replied ?? 0),
    unanswered: Number(row?.unanswered ?? 0),
  };
}

export type DemandRow = {
  productId: string | null;
  productCode: string;
  productName: string;
  slug: string | null;
  inquiries: number;
  quantity: number;
};

/**
 * What people are actually asking for.
 *
 * Grouped by the code recorded on the item rather than by the product row, so
 * a product that has since been withdrawn still shows the demand it attracted.
 */
export async function getDemandByProduct(days = 90, take = 8): Promise<DemandRow[]> {
  return prisma.$queryRaw<DemandRow[]>(Prisma.sql`
    SELECT
      MAX(p.id)                        AS "productId",
      it."productCode"                 AS "productCode",
      MAX(it."productName")            AS "productName",
      MAX(p.slug)                      AS "slug",
      COUNT(DISTINCT it."inquiryId")::int AS "inquiries",
      SUM(it.quantity)::int            AS "quantity"
    FROM inquiry_items it
    JOIN inquiries i ON i.id = it."inquiryId"
    LEFT JOIN products p ON p.id = it."productId"
    WHERE i."createdAt" >= ${daysAgo(days)}
    GROUP BY it."productCode"
    ORDER BY "inquiries" DESC, "quantity" DESC
    LIMIT ${take}
  `);
}

export type CategoryDemandRow = {
  name: string;
  slug: string;
  inquiries: number;
  quantity: number;
};

/** The same question asked of categories, which is what buying decisions need. */
export async function getDemandByCategory(days = 90, take = 8) {
  return prisma.$queryRaw<CategoryDemandRow[]>(Prisma.sql`
    SELECT
      c.name                              AS "name",
      c.slug                              AS "slug",
      COUNT(DISTINCT it."inquiryId")::int AS "inquiries",
      SUM(it.quantity)::int               AS "quantity"
    FROM inquiry_items it
    JOIN inquiries i ON i.id = it."inquiryId"
    JOIN products p  ON p.id = it."productId"
    JOIN categories c ON c.id = p."categoryId"
    WHERE i."createdAt" >= ${daysAgo(days)}
    GROUP BY c.name, c.slug
    ORDER BY "inquiries" DESC
    LIMIT ${take}
  `);
}

/**
 * What is wrong with the catalogue right now.
 *
 * Each of these is a job somebody can do something about this afternoon, which
 * is the only kind of number worth putting on a dashboard.
 */
export async function getCatalogueHealth() {
  const live = { deletedAt: null } as const;

  const [drafts, unphotographed, outOfStock, emptyCategories, total] =
    await Promise.all([
      prisma.product.count({ where: { ...live, isPublished: false } }),
      prisma.product.count({ where: { ...live, isPublished: true, images: { none: {} } } }),
      prisma.product.count({ where: { ...live, isPublished: true, availability: "OUT_OF_STOCK" } }),
      // Empty means nothing published anywhere underneath, asked of the top
      // level only. A subcategory carries no products of its own by design, so
      // counting those would report the whole tree as empty.
      prisma.category.count({
        where: {
          deletedAt: null,
          isHidden: false,
          parentId: null,
          productsAsCategory: { none: { deletedAt: null, isPublished: true } },
          children: {
            none: {
              OR: [
                { productsAsCategory: { some: { deletedAt: null, isPublished: true } } },
                { productsAsSubcategory: { some: { deletedAt: null, isPublished: true } } },
              ],
            },
          },
        },
      }),
      prisma.product.count({ where: live }),
    ]);

  return { drafts, unphotographed, outOfStock, emptyCategories, total };
}

/** Who has arrived lately, and who never finished signing up. */
export async function getPeopleGrowth() {
  const [thisMonth, lastMonth, unverified, customers] = await Promise.all([
    prisma.user.count({
      where: { role: "USER", deletedAt: null, createdAt: { gte: daysAgo(30) } },
    }),
    prisma.user.count({
      where: {
        role: "USER",
        deletedAt: null,
        createdAt: { gte: daysAgo(60), lt: daysAgo(30) },
      },
    }),
    prisma.user.count({
      where: { role: "USER", deletedAt: null, emailVerifiedAt: null },
    }),
    prisma.user.count({ where: { role: "USER", deletedAt: null } }),
  ]);

  return { thisMonth, lastMonth, unverified, customers };
}

/** How many pieces were asked for in a window, which is the size of the demand. */
export async function getRequestedPieces(days = 30) {
  const [items, inquiries] = await Promise.all([
    prisma.inquiryItem.aggregate({
      where: { inquiry: { createdAt: { gte: daysAgo(days) } } },
      _sum: { quantity: true },
    }),
    prisma.inquiry.count({ where: { createdAt: { gte: daysAgo(days) } } }),
  ]);

  return { pieces: items._sum.quantity ?? 0, inquiries };
}

/** Which manager is carrying what, so work can be levelled rather than guessed at. */
export async function getManagerLoad() {
  const managers = await prisma.user.findMany({
    where: { role: { in: ["MANAGER", "ADMIN"] }, deletedAt: null, isActive: true },
    select: {
      id: true,
      fullName: true,
      assignedInquiry: {
        where: { status: { notIn: ["CLOSED", "COMPLETED"] } },
        select: { id: true, unreadForManager: true },
      },
    },
    orderBy: { fullName: "asc" },
  });

  return managers.map((manager) => ({
    id: manager.id,
    fullName: manager.fullName,
    open: manager.assignedInquiry.length,
    waiting: manager.assignedInquiry.filter((inquiry) => inquiry.unreadForManager).length,
  }));
}
