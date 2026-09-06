import "server-only";

import { site } from "@/lib/site";
import { escapeHtml } from "@/server/email/templates";

/**
 * Conversation emails.
 *
 * A manager writing in the inquiry thread is writing an email, whether or not
 * they think of it that way, so what arrives has to read like one: their words
 * first, the reference for context, and a link back to the thread.
 *
 * Every value is escaped. A manager is trusted, but a customer's own words are
 * quoted back in the notification that goes to the team, and those are not.
 */

type Contact = { phone: string; email: string; addressLines: string[] };

function paragraphs(value: string, colour = "#574c43"): string {
  return value
    .split(/\n{2,}/)
    .map(
      (block) =>
        `<p style="margin:0 0 14px;line-height:1.65;color:${colour};">${escapeHtml(block).replace(
          /\n/g,
          "<br />",
        )}</p>`,
    )
    .join("");
}

function layout(input: {
  title: string;
  preheader: string;
  body: string;
  contact: Contact;
}): string {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${escapeHtml(input.title)}</title>
</head>
<body style="margin:0;padding:0;background-color:#f3ede4;font-family:Helvetica,Arial,sans-serif;color:#1e1815;">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;">${escapeHtml(input.preheader)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f3ede4;padding:32px 16px;">
  <tr>
    <td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;background-color:#ffffff;border:1px solid #e7dfd3;">
        <tr>
          <td style="padding:28px 32px 0;">
            <p style="margin:0;font-size:17px;color:#1e1815;">${escapeHtml(site.name)}</p>
            <div style="height:1px;background-color:#a9482c;width:40px;margin:16px 0 0;"></div>
          </td>
        </tr>
        <tr><td style="padding:24px 32px 32px;font-size:15px;">${input.body}</td></tr>
        <tr>
          <td style="padding:20px 32px 28px;border-top:1px solid #e7dfd3;font-size:13px;color:#857567;line-height:1.6;">
            <p style="margin:0 0 6px;color:#574c43;">${escapeHtml(site.name)}</p>
            <p style="margin:0;">${input.contact.addressLines.map(escapeHtml).join(", ")}</p>
            <p style="margin:6px 0 0;">${escapeHtml(input.contact.phone)} &nbsp;&middot;&nbsp;
              <a href="mailto:${escapeHtml(input.contact.email)}" style="color:#83341e;">${escapeHtml(input.contact.email)}</a>
            </p>
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>
</body>
</html>`;
}

/** The customer's copy of a message a manager wrote in the thread. */
export function managerReplyTemplate(input: {
  reference: string;
  customerName: string;
  managerName: string;
  body: string;
  threadUrl: string;
  contact: Contact;
}) {
  const subject = `Reply about inquiry ${input.reference} | ${site.name}`;

  const html = layout({
    title: subject,
    preheader: input.body.slice(0, 120),
    contact: input.contact,
    body: `
      <p style="margin:0 0 18px;color:#857567;font-size:13px;">
        About inquiry <span style="color:#1e1815;">${escapeHtml(input.reference)}</span>
      </p>

      ${paragraphs(input.body, "#1e1815")}

      <p style="margin:22px 0 0;color:#574c43;">
        ${escapeHtml(input.managerName)}<br />
        <span style="color:#857567;font-size:13px;">${escapeHtml(site.name)}</span>
      </p>

      <p style="margin:26px 0 8px;">
        <a href="${escapeHtml(input.threadUrl)}" style="display:inline-block;background-color:#1e1815;color:#ffffff;text-decoration:none;padding:12px 22px;font-size:15px;">Reply to this message</a>
      </p>
      <p style="margin:10px 0 0;font-size:13px;color:#857567;">
        You can also reply to this email and it will reach the same person.
      </p>`,
  });

  const text = [
    `About inquiry ${input.reference}`,
    "",
    input.body,
    "",
    input.managerName,
    site.name,
    "",
    `Reply in the thread: ${input.threadUrl}`,
    "You can also reply to this email and it will reach the same person.",
  ].join("\n");

  return { subject, html, text };
}

/** The team's notification that a customer has written back. */
export function customerReplyTemplate(input: {
  reference: string;
  customerName: string;
  body: string;
  manageUrl: string;
  contact: Contact;
}) {
  const subject = `${input.customerName} replied about ${input.reference}`;

  const html = layout({
    title: subject,
    preheader: input.body.slice(0, 120),
    contact: input.contact,
    body: `
      <p style="margin:0 0 16px;font-size:19px;line-height:1.3;">
        ${escapeHtml(input.customerName)} replied
      </p>
      <p style="margin:0 0 18px;color:#857567;font-size:13px;">
        Inquiry <span style="color:#1e1815;">${escapeHtml(input.reference)}</span>
      </p>

      ${paragraphs(input.body)}

      <p style="margin:26px 0 0;">
        <a href="${escapeHtml(input.manageUrl)}" style="display:inline-block;background-color:#1e1815;color:#ffffff;text-decoration:none;padding:12px 22px;font-size:15px;">Open the inquiry</a>
      </p>`,
  });

  const text = [
    `${input.customerName} replied about inquiry ${input.reference}`,
    "",
    input.body,
    "",
    `Open: ${input.manageUrl}`,
  ].join("\n");

  return { subject, html, text };
}

/** Tells the customer their inquiry has moved on. */
export function statusChangedTemplate(input: {
  reference: string;
  customerName: string;
  statusLabel: string;
  statusNote: string;
  threadUrl: string;
  contact: Contact;
}) {
  const subject = `Inquiry ${input.reference} is now ${input.statusLabel.toLowerCase()}`;

  const html = layout({
    title: subject,
    preheader: input.statusNote,
    contact: input.contact,
    body: `
      <p style="margin:0 0 16px;font-size:19px;line-height:1.3;">
        Your inquiry is now ${escapeHtml(input.statusLabel.toLowerCase())}
      </p>
      <p style="margin:0 0 18px;color:#857567;font-size:13px;">
        Inquiry <span style="color:#1e1815;">${escapeHtml(input.reference)}</span>
      </p>
      <p style="margin:0 0 14px;line-height:1.65;color:#574c43;">${escapeHtml(input.statusNote)}</p>
      <p style="margin:26px 0 0;">
        <a href="${escapeHtml(input.threadUrl)}" style="display:inline-block;background-color:#1e1815;color:#ffffff;text-decoration:none;padding:12px 22px;font-size:15px;">Open your inquiry</a>
      </p>`,
  });

  const text = [
    `Your inquiry ${input.reference} is now ${input.statusLabel.toLowerCase()}.`,
    "",
    input.statusNote,
    "",
    `Open your inquiry: ${input.threadUrl}`,
  ].join("\n");

  return { subject, html, text };
}
