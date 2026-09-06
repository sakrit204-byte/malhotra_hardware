import "server-only";

import { Prisma } from "@/generated/prisma/client";
import type { InquiryStatus } from "@/generated/prisma/enums";
import { prisma } from "@/server/db/prisma";
import type { ManagerQuery } from "@/server/validation/manager";
import { INQUIRIES_PER_PAGE } from "@/server/validation/manager";

/**
 * Data for the manager platform.
 *
 * The dashboard counts every status in one grouped query rather than eight
 * separate ones, and the list carries only the columns the table shows. Both
 * matter once there are thousands of inquiries rather than five.
 */

export type StatusCounts = Record<InquiryStatus, number> & { total: number };

const EMPTY_COUNTS: StatusCounts = {
  NEW: 0,
  UNDER_REVIEW: 0,
  AWAITING_CUSTOMER: 0,
  CUSTOMER_RESPONDED: 0,
  QUOTATION_PENDING: 0,
  QUOTATION_SENT: 0,
  COMPLETED: 0,
  CLOSED: 0,
  total: 0,
};

export async function getDashboardCounts(): Promise<StatusCounts> {
  const rows = await prisma.inquiry.groupBy({
    by: ["status"],
    _count: { _all: true },
  });

  const counts = { ...EMPTY_COUNTS };

  for (const row of rows) {
    counts[row.status] = row._count._all;
    counts.total += row._count._all;
  }

  return counts;
}

/** Everything the dashboard needs beyond the status counts. */
export async function getDashboardSummary() {
  const [unread, unassigned, awaitingUs, recent, activity] = await Promise.all([
    prisma.inquiry.count({ where: { unreadForManager: true } }),
    prisma.inquiry.count({
      where: { assignedManagerId: null, status: { notIn: ["COMPLETED", "CLOSED"] } },
    }),
    prisma.inquiry.count({
      where: { status: { in: ["NEW", "UNDER_REVIEW", "CUSTOMER_RESPONDED"] } },
    }),
    prisma.inquiry.findMany({
      orderBy: { lastActivityAt: "desc" },
      take: 6,
      select: {
        id: true,
        reference: true,
        fullName: true,
        projectName: true,
        status: true,
        itemCount: true,
        lastActivityAt: true,
        unreadForManager: true,
        manager: { select: { fullName: true } },
      },
    }),
    prisma.inquiryMessage.findMany({
      where: { isInternalNote: false },
      orderBy: { createdAt: "desc" },
      take: 6,
      select: {
        id: true,
        senderType: true,
        senderName: true,
        body: true,
        createdAt: true,
        inquiry: { select: { id: true, reference: true } },
      },
    }),
  ]);

  return { unread, unassigned, awaitingUs, recent, activity };
}

/**
 * The inquiry list.
 *
 * Search covers the reference, the customer name, the address and the project,
 * because a manager on the phone has whichever of those the customer happens to
 * say first.
 */
export async function listInquiriesForManager(query: ManagerQuery) {
  const and: Prisma.InquiryWhereInput[] = [];

  if (query.status.length > 0) {
    and.push({ status: { in: query.status } });
  }

  if (query.assigned === "mine" && query.managerId) {
    and.push({ assignedManagerId: query.managerId });
  } else if (query.assigned === "unassigned") {
    and.push({ assignedManagerId: null });
  }

  if (query.unread) {
    and.push({ unreadForManager: true });
  }

  if (query.q) {
    const term = query.q.trim();

    and.push({
      OR: [
        { reference: { contains: term, mode: "insensitive" } },
        { fullName: { contains: term, mode: "insensitive" } },
        { email: { contains: term, mode: "insensitive" } },
        { phone: { contains: term, mode: "insensitive" } },
        { projectName: { contains: term, mode: "insensitive" } },
        { companyName: { contains: term, mode: "insensitive" } },
      ],
    });
  }

  const where: Prisma.InquiryWhereInput = and.length > 0 ? { AND: and } : {};

  const orderBy: Prisma.InquiryOrderByWithRelationInput =
    query.sort === "oldest"
      ? { createdAt: "asc" }
      : query.sort === "created"
        ? { createdAt: "desc" }
        : query.sort === "items"
          ? { itemCount: "desc" }
          : { lastActivityAt: "desc" };

  const total = await prisma.inquiry.count({ where });
  const pageCount = Math.max(1, Math.ceil(total / INQUIRIES_PER_PAGE));
  const page = Math.min(query.page, pageCount);

  const items = await prisma.inquiry.findMany({
    where,
    orderBy,
    skip: (page - 1) * INQUIRIES_PER_PAGE,
    take: INQUIRIES_PER_PAGE,
    select: {
      id: true,
      reference: true,
      fullName: true,
      email: true,
      phone: true,
      companyName: true,
      projectName: true,
      status: true,
      itemCount: true,
      createdAt: true,
      lastActivityAt: true,
      unreadForManager: true,
      manager: { select: { id: true, fullName: true } },
    },
  });

  return { items, total, page, pageCount };
}

export type ManagerInquiryRow = Awaited<
  ReturnType<typeof listInquiriesForManager>
>["items"][number];

/** The full inquiry, including internal notes, which customers never see. */
export async function getInquiryForManager(id: string) {
  return prisma.inquiry.findUnique({
    where: { id },
    select: {
      id: true,
      reference: true,
      status: true,
      createdAt: true,
      lastActivityAt: true,
      fullName: true,
      email: true,
      phone: true,
      companyName: true,
      projectName: true,
      projectLocation: true,
      message: true,
      additionalRequirements: true,
      itemCount: true,
      summaryPath: true,
      userId: true,
      assignedManagerId: true,
      ipAddress: true,
      customer: { select: { id: true, email: true, emailVerifiedAt: true } },
      manager: { select: { id: true, fullName: true } },
      items: {
        orderBy: { sortOrder: "asc" },
        select: {
          id: true,
          productName: true,
          productCode: true,
          variantLabel: true,
          finishLabel: true,
          imageUrl: true,
          quantity: true,
          note: true,
          product: { select: { slug: true } },
        },
      },
      messages: {
        orderBy: { createdAt: "asc" },
        select: {
          id: true,
          senderType: true,
          senderName: true,
          body: true,
          isInternalNote: true,
          createdAt: true,
          readByCustomerAt: true,
          attachments: {
            select: { id: true, fileName: true, fileSize: true, mimeType: true },
          },
        },
      },
      attachments: {
        where: { messageId: null },
        orderBy: { createdAt: "asc" },
        select: { id: true, fileName: true, fileSize: true, mimeType: true },
      },
      statusHistory: {
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          fromStatus: true,
          toStatus: true,
          note: true,
          createdAt: true,
          changedBy: { select: { fullName: true } },
        },
      },
      emailLogs: {
        orderBy: { createdAt: "desc" },
        take: 8,
        select: {
          id: true,
          toAddress: true,
          subject: true,
          status: true,
          error: true,
          createdAt: true,
        },
      },
    },
  });
}

export type ManagerInquiry = NonNullable<
  Awaited<ReturnType<typeof getInquiryForManager>>
>;

/** Marks the thread read by the team. */
export async function markReadByManager(inquiryId: string): Promise<void> {
  const now = new Date();

  await prisma.$transaction([
    prisma.inquiry.update({
      where: { id: inquiryId },
      data: { unreadForManager: false },
    }),
    prisma.inquiryMessage.updateMany({
      where: { inquiryId, senderType: "CUSTOMER", readByManagerAt: null },
      data: { readByManagerAt: now },
    }),
  ]);
}

/** Managers available to take an inquiry. */
export async function listManagers() {
  return prisma.user.findMany({
    where: { role: { in: ["MANAGER", "ADMIN"] }, isActive: true, deletedAt: null },
    orderBy: { fullName: "asc" },
    select: { id: true, fullName: true, email: true, role: true },
  });
}
