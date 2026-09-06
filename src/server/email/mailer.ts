import "server-only";

import nodemailer, { type Transporter } from "nodemailer";

import { prisma } from "@/server/db/prisma";
import { env } from "@/server/env";

/**
 * Outgoing mail.
 *
 * Two rules hold everywhere this is used:
 *
 * 1. **Sending never fails the operation that triggered it.** A customer whose
 *    inquiry was saved must get their reference number even if the mail server
 *    is unreachable. Every send is recorded in email_logs with its outcome, so
 *    a failure is visible and can be retried rather than lost.
 *
 * 2. **The driver is behind this interface.** Development posts to a local mail
 *    catcher; production points at Resend or the company mail server by
 *    changing environment variables and nothing else.
 */

export type EmailAttachment = {
  filename: string;
  content: Buffer;
  contentType: string;
};

export type SendEmailInput = {
  to: string | string[];
  subject: string;
  html: string;
  text: string;
  /** Identifies the template in the log, for example inquiryConfirmation. */
  template: string;
  inquiryId?: string;
  messageId?: string;
  replyTo?: string;
  attachments?: EmailAttachment[];
};

export type SendEmailResult = {
  sent: boolean;
  logId: string;
  error?: string;
};

let transporter: Transporter | null = null;

function getTransporter(): Transporter {
  if (transporter) return transporter;

  transporter = nodemailer.createTransport({
    host: env.MAIL_HOST,
    port: env.MAIL_PORT,
    secure: env.MAIL_SECURE,
    // The development mail catcher accepts anything and needs no credentials.
    auth: env.MAIL_USER ? { user: env.MAIL_USER, pass: env.MAIL_PASSWORD } : undefined,
    // A slow mail server must not hold a request open indefinitely.
    connectionTimeout: 10_000,
    greetingTimeout: 10_000,
    socketTimeout: 20_000,
  });

  return transporter;
}

const fromAddress = `${env.MAIL_FROM_NAME} <${env.MAIL_FROM_ADDRESS}>`;

export async function sendEmail(input: SendEmailInput): Promise<SendEmailResult> {
  const recipients = Array.isArray(input.to) ? input.to : [input.to];
  const toAddress = recipients.join(", ");

  const log = await prisma.emailLog.create({
    data: {
      toAddress,
      fromAddress: env.MAIL_FROM_ADDRESS,
      subject: input.subject,
      template: input.template,
      status: "QUEUED",
      inquiryId: input.inquiryId ?? null,
      messageId: input.messageId ?? null,
    },
    select: { id: true },
  });

  if (env.MAIL_DRIVER === "console") {
    console.info(`[mail] ${input.subject} to ${toAddress}\n${input.text}`);

    await prisma.emailLog.update({
      where: { id: log.id },
      data: { status: "SENT", sentAt: new Date(), attempts: 1 },
    });

    return { sent: true, logId: log.id };
  }

  try {
    const info = await getTransporter().sendMail({
      from: fromAddress,
      to: recipients,
      replyTo: input.replyTo,
      subject: input.subject,
      text: input.text,
      html: input.html,
      attachments: input.attachments?.map((attachment) => ({
        filename: attachment.filename,
        content: attachment.content,
        contentType: attachment.contentType,
      })),
    });

    await prisma.emailLog.update({
      where: { id: log.id },
      data: {
        status: "SENT",
        sentAt: new Date(),
        attempts: 1,
        providerMessageId: info.messageId ?? null,
      },
    });

    return { sent: true, logId: log.id };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);

    console.error(`Failed to send ${input.template} to ${toAddress}`, error);

    await prisma.emailLog
      .update({
        where: { id: log.id },
        data: { status: "FAILED", attempts: 1, error: message.slice(0, 500) },
      })
      .catch(() => undefined);

    return { sent: false, logId: log.id, error: message };
  }
}
