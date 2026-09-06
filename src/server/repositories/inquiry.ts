import "server-only";

import { prisma } from "@/server/db/prisma";

/**
 * Inquiry data access.
 *
 * Nothing here decides who may see an inquiry. Authorisation lives in
 * server/inquiry/access, and every caller asks there first. Keeping the two
 * apart means a new page cannot accidentally acquire a different idea of who is
 * allowed to read what.
 */

/** The full view of one inquiry, shared by the customer and manager screens. */
export async function getInquiryDetail(id: string) {
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
      unreadForCustomer: true,
      unreadForManager: true,
      manager: { select: { fullName: true } },
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
          product: { select: { slug: true, isPublished: true, deletedAt: true } },
        },
      },
      messages: {
        where: { isInternalNote: false },
        orderBy: { createdAt: "asc" },
        select: {
          id: true,
          senderType: true,
          senderName: true,
          body: true,
          createdAt: true,
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
        orderBy: { createdAt: "asc" },
        select: {
          id: true,
          fromStatus: true,
          toStatus: true,
          note: true,
          createdAt: true,
        },
      },
    },
  });
}

export type InquiryDetail = NonNullable<Awaited<ReturnType<typeof getInquiryDetail>>>;

/** Every inquiry belonging to one account, newest first. */
export async function listInquiriesForUser(userId: string) {
  return prisma.inquiry.findMany({
    where: { userId },
    orderBy: { lastActivityAt: "desc" },
    select: {
      id: true,
      reference: true,
      status: true,
      createdAt: true,
      lastActivityAt: true,
      projectName: true,
      itemCount: true,
      unreadForCustomer: true,
      items: {
        take: 3,
        orderBy: { sortOrder: "asc" },
        select: { id: true, productName: true, imageUrl: true },
      },
    },
  });
}

/** Marks the thread read by the customer, so the unread marker clears. */
export async function markReadByCustomer(inquiryId: string): Promise<void> {
  const now = new Date();

  await prisma.$transaction([
    prisma.inquiry.update({
      where: { id: inquiryId },
      data: { unreadForCustomer: false },
    }),
    prisma.inquiryMessage.updateMany({
      where: { inquiryId, senderType: "MANAGER", readByCustomerAt: null },
      data: { readByCustomerAt: now },
    }),
  ]);
}
