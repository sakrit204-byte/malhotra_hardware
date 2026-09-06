import "server-only";

import { randomUUID } from "node:crypto";

import { formatInquiryReference } from "@/lib/reference";
import { prisma } from "@/server/db/prisma";
import { env, managerNotificationAddresses } from "@/server/env";
import { issueToken } from "@/server/auth/tokens";
import { sendEmail } from "@/server/email/mailer";
import {
  inquiryConfirmation,
  managerNotification,
  type InquiryEmailData,
} from "@/server/email/templates";
import type { ValidatedFile } from "@/server/inquiry/attachments";
import type { ResolvedLine } from "@/server/inquiry/resolve";
import { renderInquirySummary } from "@/server/pdf/inquiry-summary";
import { getContactContent } from "@/server/repositories/content";
import { deletePrivateFile, savePrivateFile } from "@/server/storage";
import type { InquiryFormValues } from "@/server/validation/inquiry";

/**
 * Creating an inquiry.
 *
 * This is the one operation the whole product exists for, so it is written to
 * be safe under every condition we can anticipate.
 *
 * **Identity.** A signed in customer's inquiry is bound to their account and
 * uses the account's email address, not whatever the form carried. That closes
 * the hole where someone signed in could file an inquiry under another person's
 * address and later have it swept into that person's history. A guest's inquiry
 * stores the details they typed and is bound to no account, even when the
 * address happens to match one. The owner of that address can claim it later,
 * after proving the address is theirs.
 *
 * **Atomicity.** The reference number, the inquiry, its items, its first status
 * entry and the team notification are written in one transaction. Either a
 * customer gets a complete inquiry and a reference, or nothing is written.
 *
 * **Side effects come after the commit.** Rendering a PDF and talking to a mail
 * server are slow and can fail. Neither happens inside the transaction, and
 * neither can fail the submission: a customer whose confirmation email bounced
 * still has an inquiry and a reference number, and the failure is recorded.
 *
 * **Idempotency.** A double submission, from an impatient click or a retried
 * request, returns the reference that was just created instead of filing the
 * same inquiry twice.
 */

export type CreateInquiryInput = {
  form: InquiryFormValues;
  lines: ResolvedLine[];
  attachments: ValidatedFile[];
  session: { id: string; email: string; fullName: string } | null;
  ipAddress: string | null;
};

export type CreateInquiryResult =
  | { ok: true; id: string; reference: string; duplicate: boolean }
  | { ok: false; error: string };

const DUPLICATE_WINDOW_MS = 2 * 60 * 1000;

/** A stable description of what was asked for, used to spot a double send. */
function basketSignature(lines: ResolvedLine[]): string {
  return lines
    .map((line) => `${line.productId}:${line.variantId ?? ""}:${line.quantity}`)
    .sort()
    .join("|");
}

async function findRecentDuplicate(
  email: string,
  lines: ResolvedLine[],
): Promise<{ id: string; reference: string } | null> {
  const since = new Date(Date.now() - DUPLICATE_WINDOW_MS);

  const recent = await prisma.inquiry.findMany({
    where: { email, createdAt: { gte: since } },
    orderBy: { createdAt: "desc" },
    take: 3,
    select: {
      id: true,
      reference: true,
      items: { select: { productId: true, variantId: true, quantity: true } },
    },
  });

  const signature = basketSignature(lines);

  for (const inquiry of recent) {
    const existing = inquiry.items
      .map((item) => `${item.productId ?? ""}:${item.variantId ?? ""}:${item.quantity}`)
      .sort()
      .join("|");

    if (existing === signature) {
      return { id: inquiry.id, reference: inquiry.reference };
    }
  }

  return null;
}

/**
 * Takes the next reference number for the year.
 *
 * The upsert is a single statement, so two submissions arriving at the same
 * moment cannot read the same number. A rolled back transaction leaves a gap in
 * the sequence, which is fine: references have to be unique and readable, not
 * consecutive.
 */
async function nextSequence(
  tx: Pick<typeof prisma, "$queryRaw">,
  year: number,
): Promise<number> {
  const rows = await tx.$queryRaw<Array<{ lastNumber: number }>>`
    INSERT INTO inquiry_sequences (year, "lastNumber", "updatedAt")
    VALUES (${year}, 1, now())
    ON CONFLICT (year)
    DO UPDATE SET "lastNumber" = inquiry_sequences."lastNumber" + 1, "updatedAt" = now()
    RETURNING "lastNumber"
  `;

  const value = rows[0]?.lastNumber;

  if (!value) {
    throw new Error("Could not allocate an inquiry reference number");
  }

  return value;
}

export async function createInquiry(
  input: CreateInquiryInput,
): Promise<CreateInquiryResult> {
  const { form, lines, attachments, session } = input;

  if (lines.length === 0) {
    return { ok: false, error: "Add at least one product before sending an inquiry." };
  }

  if (lines.some((line) => line.needsVariantChoice)) {
    return {
      ok: false,
      error: "One of your products needs an option chosen before you can send this.",
    };
  }

  // A signed in customer is identified by their account, never by the form.
  const email = session ? session.email.toLowerCase() : form.email.toLowerCase();
  const userId = session?.id ?? null;

  const duplicate = await findRecentDuplicate(email, lines);
  if (duplicate) {
    return { ok: true, id: duplicate.id, reference: duplicate.reference, duplicate: true };
  }

  // The identifier is generated here so that attachments can be written under
  // it before the row exists. If the transaction fails, the files are removed
  // again in the catch below and nothing is left behind.
  const inquiryId = randomUUID();
  const year = new Date().getFullYear();

  const storedFiles: Array<{
    storagePath: string;
    fileName: string;
    mimeType: string;
    fileSize: number;
  }> = [];

  try {
    for (const file of attachments) {
      storedFiles.push(
        await savePrivateFile({
          folder: inquiryId.replace(/[^a-zA-Z0-9]/g, ""),
          fileName: file.fileName,
          mimeType: file.mimeType,
          content: file.content,
        }),
      );
    }

    const created = await prisma.$transaction(async (tx) => {
      const sequence = await nextSequence(tx, year);
      const reference = formatInquiryReference(year, sequence);

      const inquiry = await tx.inquiry.create({
        data: {
          id: inquiryId,
          reference,
          year,
          sequence,
          // Connected through the relation rather than by writing the foreign
          // key, which is the form Prisma accepts alongside nested creates.
          ...(userId ? { customer: { connect: { id: userId } } } : {}),
          fullName: form.fullName,
          email,
          phone: form.phone,
          companyName: form.companyName ?? null,
          projectName: form.projectName ?? null,
          projectLocation: form.projectLocation ?? null,
          additionalRequirements: form.additionalRequirements ?? null,
          message: form.message,
          status: "NEW",
          itemCount: lines.length,
          lastActivityAt: new Date(),
          unreadForManager: true,
          ipAddress: input.ipAddress,
          items: {
            create: lines.map((line, index) => ({
              productId: line.productId,
              variantId: line.variantId,
              // Snapshot the wording as it stands today, so this inquiry still
              // reads correctly after the product is renamed or withdrawn.
              productName: line.product.name,
              productCode: line.variant?.code ?? line.product.code,
              variantLabel: line.variant?.name ?? null,
              finishLabel: line.variant?.finishName ?? line.product.finishName,
              imageUrl: line.product.imageUrl,
              quantity: line.quantity,
              note: line.note,
              sortOrder: index * 10,
            })),
          },
          statusHistory: {
            create: {
              toStatus: "NEW",
              note: "Inquiry received from the website.",
            },
          },
          attachments: {
            create: storedFiles.map((file) => ({
              fileName: file.fileName,
              storagePath: file.storagePath,
              mimeType: file.mimeType,
              fileSize: file.fileSize,
              uploadedByType: "CUSTOMER" as const,
              ...(userId ? { uploadedBy: { connect: { id: userId } } } : {}),
            })),
          },
        },
        select: { id: true, reference: true, createdAt: true },
      });

      await tx.notification.create({
        data: {
          forRole: "MANAGER",
          type: "INQUIRY_CREATED",
          title: `New inquiry ${inquiry.reference}`,
          body: `${form.fullName} sent an inquiry with ${lines.length} ${
            lines.length === 1 ? "product" : "products"
          }.`,
          linkPath: `/manager/inquiries/${inquiry.id}`,
          inquiry: { connect: { id: inquiry.id } },
        },
      });

      await tx.auditLog.create({
        data: {
          ...(userId ? { actor: { connect: { id: userId } } } : {}),
          actorEmail: email,
          // A customer acting on their own inquiry is recorded by account and
          // address. The role column describes staff actions.
          action: "inquiry.created",
          entityType: "Inquiry",
          entityId: inquiry.id,
          summary: `Inquiry ${inquiry.reference} created with ${lines.length} products`,
          ipAddress: input.ipAddress,
        },
      });

      return inquiry;
    });

    // Everything from here is best effort. The inquiry exists and the customer
    // is about to be shown their reference number whatever happens next.
    await deliverInquiryPaperwork({
      inquiryId: created.id,
      reference: created.reference,
      createdAt: created.createdAt,
      form,
      email,
      lines,
      attachmentCount: storedFiles.length,
      isGuest: !session,
    }).catch((error) => {
      console.error(`Follow up for inquiry ${created.reference} failed`, error);
    });

    return {
      ok: true,
      id: created.id,
      reference: created.reference,
      duplicate: false,
    };
  } catch (error) {
    console.error("Failed to create inquiry", error);

    // Remove any files written for an inquiry that was never stored.
    await Promise.all(storedFiles.map((file) => deletePrivateFile(file.storagePath)));

    return {
      ok: false,
      error:
        "We could not save your inquiry just now. Please try again, or call us and we will take the details directly.",
    };
  }
}

type PaperworkInput = {
  inquiryId: string;
  reference: string;
  createdAt: Date;
  form: InquiryFormValues;
  email: string;
  lines: ResolvedLine[];
  attachmentCount: number;
  isGuest: boolean;
};

/**
 * Generates the summary, stores it, and sends the confirmation and the team
 * notification. Every step is independent: a failure in one does not stop the
 * others, and all of them are recorded.
 */
async function deliverInquiryPaperwork(input: PaperworkInput): Promise<void> {
  const contact = await getContactContent();

  const items = input.lines.map((line) => ({
    productName: line.product.name,
    productCode: line.variant?.code ?? line.product.code,
    variantLabel: line.variant?.name ?? null,
    finishLabel: line.variant?.finishName ?? line.product.finishName,
    quantity: line.quantity,
    note: line.note,
  }));

  let summary: Buffer | null = null;

  if (env.FEATURE_ATTACH_SUMMARY_PDF) {
    try {
      summary = await renderInquirySummary({
        reference: input.reference,
        createdAt: input.createdAt,
        status: "New",
        fullName: input.form.fullName,
        email: input.email,
        phone: input.form.phone,
        companyName: input.form.companyName ?? null,
        projectName: input.form.projectName ?? null,
        projectLocation: input.form.projectLocation ?? null,
        message: input.form.message,
        additionalRequirements: input.form.additionalRequirements ?? null,
        items,
        contact,
      });

      const stored = await savePrivateFile({
        folder: input.inquiryId.replace(/[^a-zA-Z0-9]/g, ""),
        fileName: `Inquiry ${input.reference}.pdf`,
        mimeType: "application/pdf",
        content: summary,
      });

      await prisma.inquiry.update({
        where: { id: input.inquiryId },
        data: { summaryPath: stored.storagePath },
      });
    } catch (error) {
      // A missing summary is a nuisance, not a failure. It can be regenerated
      // on demand from the record itself.
      console.error(`Could not generate the summary for ${input.reference}`, error);
      summary = null;
    }
  }

  // A guest has no account to sign in to, so they get a signed link that opens
  // their own inquiry and nothing else.
  let trackUrl: string | undefined;

  if (input.isGuest) {
    try {
      const issued = await issueToken({
        type: "INQUIRY_ACCESS",
        email: input.email,
        inquiryId: input.inquiryId,
        lifetimeSeconds: 60 * 60 * 24 * 180,
      });

      trackUrl = `${env.APP_URL}/inquiry/track?token=${encodeURIComponent(issued.token)}`;
    } catch (error) {
      console.error(`Could not issue an access link for ${input.reference}`, error);
    }
  } else {
    trackUrl = `${env.APP_URL}/account/inquiries`;
  }

  const emailData: InquiryEmailData = {
    reference: input.reference,
    fullName: input.form.fullName,
    email: input.email,
    phone: input.form.phone,
    companyName: input.form.companyName ?? null,
    projectName: input.form.projectName ?? null,
    projectLocation: input.form.projectLocation ?? null,
    message: input.form.message,
    additionalRequirements: input.form.additionalRequirements ?? null,
    items,
    attachmentCount: input.attachmentCount,
    createdAt: input.createdAt,
    contact,
    trackUrl,
  };

  const confirmation = inquiryConfirmation(emailData);

  await sendEmail({
    to: input.email,
    subject: confirmation.subject,
    html: confirmation.html,
    text: confirmation.text,
    template: "inquiryConfirmation",
    inquiryId: input.inquiryId,
    replyTo: contact.email,
    attachments: summary
      ? [
          {
            filename: `Inquiry ${input.reference}.pdf`,
            content: summary,
            contentType: "application/pdf",
          },
        ]
      : undefined,
  });

  if (managerNotificationAddresses.length > 0) {
    const notification = managerNotification({
      ...emailData,
      manageUrl: `${env.APP_URL}/manager/inquiries/${input.inquiryId}`,
    });

    await sendEmail({
      to: managerNotificationAddresses,
      subject: notification.subject,
      html: notification.html,
      text: notification.text,
      template: "managerNotification",
      inquiryId: input.inquiryId,
      replyTo: input.email,
    });
  }
}
