import "server-only";

import type { InquiryStatus } from "@/generated/prisma/enums";
import { statusLabel, statusNote } from "@/lib/inquiry-status";
import { issueToken } from "@/server/auth/tokens";
import { prisma } from "@/server/db/prisma";
import {
  customerReplyTemplate,
  managerReplyTemplate,
  statusChangedTemplate,
} from "@/server/email/conversation-templates";
import { sendEmail } from "@/server/email/mailer";
import { env, managerNotificationAddresses } from "@/server/env";
import { getContactContent } from "@/server/repositories/content";

/**
 * The conversation between a customer and the team.
 *
 * Two rules run through all of it.
 *
 * **Every manager message reaches the customer by email.** That is the whole
 * promise of the product: a customer who never signs in still gets answered.
 * The email is sent after the message is committed, so a mail failure can lose
 * the notification but never the message, and the failure is recorded.
 *
 * **An internal note is never sent anywhere.** It is stored on the thread for
 * the team, excluded from every customer facing query, and produces no email.
 * The flag is checked in the repository as well as here, so a new page cannot
 * accidentally leak one.
 */

/**
 * A link that opens the thread for whoever is being written to.
 *
 * A customer with an account goes to their account. A guest gets a fresh signed
 * link, because tokens are stored hashed and the old one cannot be read back.
 */
async function threadUrlFor(inquiry: {
  id: string;
  email: string;
  userId: string | null;
}): Promise<string> {
  if (inquiry.userId) {
    return `${env.APP_URL}/account/inquiries/${inquiry.id}`;
  }

  try {
    const issued = await issueToken({
      type: "INQUIRY_ACCESS",
      email: inquiry.email,
      inquiryId: inquiry.id,
      lifetimeSeconds: 60 * 60 * 24 * 180,
    });

    return `${env.APP_URL}/inquiry/track?token=${encodeURIComponent(issued.token)}`;
  } catch (error) {
    console.error(`Could not issue an access link for inquiry ${inquiry.id}`, error);
    return `${env.APP_URL}/contact`;
  }
}

export type MessageResult =
  | { ok: true; messageId: string; emailed: boolean }
  | { ok: false; error: string };

export async function sendManagerMessage(input: {
  inquiryId: string;
  manager: { id: string; fullName: string; email: string };
  body: string;
  isInternalNote: boolean;
}): Promise<MessageResult> {
  const inquiry = await prisma.inquiry.findUnique({
    where: { id: input.inquiryId },
    select: {
      id: true,
      reference: true,
      fullName: true,
      email: true,
      userId: true,
      status: true,
    },
  });

  if (!inquiry) return { ok: false, error: "That inquiry no longer exists." };

  try {
    const message = await prisma.$transaction(async (tx) => {
      const created = await tx.inquiryMessage.create({
        data: {
          inquiry: { connect: { id: inquiry.id } },
          senderType: "MANAGER",
          senderUser: { connect: { id: input.manager.id } },
          senderName: input.manager.fullName,
          body: input.body,
          isInternalNote: input.isInternalNote,
          readByManagerAt: new Date(),
        },
        select: { id: true },
      });

      await tx.inquiry.update({
        where: { id: inquiry.id },
        data: {
          lastActivityAt: new Date(),
          // An internal note is not something the customer is waiting on, so it
          // does not mark their side unread or move the inquiry along.
          ...(input.isInternalNote
            ? {}
            : {
                unreadForCustomer: true,
                unreadForManager: false,
                ...(inquiry.status === "NEW" || inquiry.status === "CUSTOMER_RESPONDED"
                  ? { status: "AWAITING_CUSTOMER" as const }
                  : {}),
              }),
        },
      });

      if (!input.isInternalNote && (inquiry.status === "NEW" || inquiry.status === "CUSTOMER_RESPONDED")) {
        await tx.inquiryStatusHistory.create({
          data: {
            inquiry: { connect: { id: inquiry.id } },
            fromStatus: inquiry.status,
            toStatus: "AWAITING_CUSTOMER",
            changedBy: { connect: { id: input.manager.id } },
            note: "Replied to the customer",
          },
        });
      }

      await tx.auditLog.create({
        data: {
          actor: { connect: { id: input.manager.id } },
          actorEmail: input.manager.email,
          actorRole: "MANAGER",
          action: input.isInternalNote ? "inquiry.noteAdded" : "inquiry.replied",
          entityType: "Inquiry",
          entityId: inquiry.id,
          summary: input.isInternalNote
            ? `Internal note added to ${inquiry.reference}`
            : `Replied to ${inquiry.reference}`,
        },
      });

      return created;
    });

    if (input.isInternalNote) {
      return { ok: true, messageId: message.id, emailed: false };
    }

    // Everything below is best effort. The message is already saved.
    const [contact, threadUrl] = await Promise.all([
      getContactContent(),
      threadUrlFor(inquiry),
    ]);

    const email = managerReplyTemplate({
      reference: inquiry.reference,
      customerName: inquiry.fullName,
      managerName: input.manager.fullName,
      body: input.body,
      threadUrl,
      contact,
    });

    const sent = await sendEmail({
      to: inquiry.email,
      subject: email.subject,
      html: email.html,
      text: email.text,
      template: "managerReply",
      inquiryId: inquiry.id,
      messageId: message.id,
      // A reply to the email reaches the person who wrote it.
      replyTo: input.manager.email,
    });

    await prisma.notification.create({
      data: {
        type: "MANAGER_REPLIED",
        title: `Reply sent for ${inquiry.reference}`,
        body: `${input.manager.fullName} answered ${inquiry.fullName}.`,
        linkPath: `/manager/inquiries/${inquiry.id}`,
        inquiry: { connect: { id: inquiry.id } },
        forRole: "MANAGER",
      },
    }).catch(() => undefined);

    return { ok: true, messageId: message.id, emailed: sent.sent };
  } catch (error) {
    console.error("Could not send the manager message", error);
    return {
      ok: false,
      error: "The message could not be saved. Please try again.",
    };
  }
}

export async function sendCustomerMessage(input: {
  inquiryId: string;
  body: string;
  sender: { id: string; fullName: string } | null;
  fallbackName: string;
}): Promise<MessageResult> {
  const inquiry = await prisma.inquiry.findUnique({
    where: { id: input.inquiryId },
    select: { id: true, reference: true, fullName: true, status: true },
  });

  if (!inquiry) return { ok: false, error: "That inquiry no longer exists." };

  try {
    const message = await prisma.$transaction(async (tx) => {
      const created = await tx.inquiryMessage.create({
        data: {
          inquiry: { connect: { id: inquiry.id } },
          senderType: "CUSTOMER",
          ...(input.sender ? { senderUser: { connect: { id: input.sender.id } } } : {}),
          senderName: input.sender?.fullName ?? input.fallbackName,
          body: input.body,
          readByCustomerAt: new Date(),
        },
        select: { id: true },
      });

      const movesOn = inquiry.status === "AWAITING_CUSTOMER";

      await tx.inquiry.update({
        where: { id: inquiry.id },
        data: {
          lastActivityAt: new Date(),
          unreadForManager: true,
          unreadForCustomer: false,
          ...(movesOn ? { status: "CUSTOMER_RESPONDED" as const } : {}),
        },
      });

      if (movesOn) {
        await tx.inquiryStatusHistory.create({
          data: {
            inquiry: { connect: { id: inquiry.id } },
            fromStatus: inquiry.status,
            toStatus: "CUSTOMER_RESPONDED",
            note: "Customer replied",
          },
        });
      }

      await tx.notification.create({
        data: {
          type: "CUSTOMER_REPLIED",
          title: `${inquiry.fullName} replied`,
          body: `New message on ${inquiry.reference}.`,
          linkPath: `/manager/inquiries/${inquiry.id}`,
          inquiry: { connect: { id: inquiry.id } },
          forRole: "MANAGER",
        },
      });

      return created;
    });

    if (managerNotificationAddresses.length > 0) {
      const contact = await getContactContent();

      const email = customerReplyTemplate({
        reference: inquiry.reference,
        customerName: input.sender?.fullName ?? input.fallbackName,
        body: input.body,
        manageUrl: `${env.APP_URL}/manager/inquiries/${inquiry.id}`,
        contact,
      });

      await sendEmail({
        to: managerNotificationAddresses,
        subject: email.subject,
        html: email.html,
        text: email.text,
        template: "customerReply",
        inquiryId: inquiry.id,
        messageId: message.id,
      });
    }

    return { ok: true, messageId: message.id, emailed: true };
  } catch (error) {
    console.error("Could not send the customer message", error);
    return { ok: false, error: "Your message could not be sent. Please try again." };
  }
}

export type StatusResult = { ok: true } | { ok: false; error: string };

export async function changeInquiryStatus(input: {
  inquiryId: string;
  status: InquiryStatus;
  note?: string;
  actor: { id: string; fullName: string; email: string };
  /** Whether the customer is told. Quiet corrections should not send mail. */
  notifyCustomer: boolean;
}): Promise<StatusResult> {
  const inquiry = await prisma.inquiry.findUnique({
    where: { id: input.inquiryId },
    select: {
      id: true,
      reference: true,
      status: true,
      fullName: true,
      email: true,
      userId: true,
    },
  });

  if (!inquiry) return { ok: false, error: "That inquiry no longer exists." };
  if (inquiry.status === input.status) return { ok: true };

  try {
    await prisma.$transaction(async (tx) => {
      await tx.inquiry.update({
        where: { id: inquiry.id },
        data: {
          status: input.status,
          lastActivityAt: new Date(),
          ...(input.status === "COMPLETED" || input.status === "CLOSED"
            ? { closedAt: new Date() }
            : { closedAt: null }),
        },
      });

      await tx.inquiryStatusHistory.create({
        data: {
          inquiry: { connect: { id: inquiry.id } },
          fromStatus: inquiry.status,
          toStatus: input.status,
          changedBy: { connect: { id: input.actor.id } },
          note: input.note ?? null,
        },
      });

      await tx.auditLog.create({
        data: {
          actor: { connect: { id: input.actor.id } },
          actorEmail: input.actor.email,
          actorRole: "MANAGER",
          action: "inquiry.statusChanged",
          entityType: "Inquiry",
          entityId: inquiry.id,
          summary: `${inquiry.reference} moved from ${inquiry.status} to ${input.status}`,
        },
      });
    });

    if (input.notifyCustomer) {
      const [contact, threadUrl] = await Promise.all([
        getContactContent(),
        threadUrlFor(inquiry),
      ]);

      const email = statusChangedTemplate({
        reference: inquiry.reference,
        customerName: inquiry.fullName,
        statusLabel: statusLabel(input.status),
        statusNote: statusNote(input.status),
        threadUrl,
        contact,
      });

      await sendEmail({
        to: inquiry.email,
        subject: email.subject,
        html: email.html,
        text: email.text,
        template: "statusChanged",
        inquiryId: inquiry.id,
        replyTo: contact.email,
      });
    }

    return { ok: true };
  } catch (error) {
    console.error("Could not change the inquiry status", error);
    return { ok: false, error: "The status could not be changed. Please try again." };
  }
}

export async function assignInquiry(input: {
  inquiryId: string;
  managerId: string | null;
  actor: { id: string; email: string };
}): Promise<StatusResult> {
  try {
    await prisma.inquiry.update({
      where: { id: input.inquiryId },
      data: {
        ...(input.managerId
          ? { manager: { connect: { id: input.managerId } } }
          : { manager: { disconnect: true } }),
      },
    });

    await prisma.auditLog.create({
      data: {
        actor: { connect: { id: input.actor.id } },
        actorEmail: input.actor.email,
        actorRole: "MANAGER",
        action: "inquiry.assigned",
        entityType: "Inquiry",
        entityId: input.inquiryId,
        summary: input.managerId ? "Inquiry assigned" : "Inquiry unassigned",
      },
    });

    return { ok: true };
  } catch (error) {
    console.error("Could not assign the inquiry", error);
    return { ok: false, error: "The inquiry could not be assigned." };
  }
}
