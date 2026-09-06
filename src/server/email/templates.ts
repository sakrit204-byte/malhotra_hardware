import "server-only";

import { site } from "@/lib/site";

/**
 * Transactional email templates.
 *
 * These are business letters, not newsletters: one column, no images, no
 * tracking, no marketing. Every value that came from a customer is escaped
 * before it reaches the markup, because an inquiry message is untrusted text
 * that will be read inside a mail client and inside the manager platform.
 */

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/** Preserves the paragraph breaks a customer typed, without allowing markup. */
function paragraphs(value: string): string {
  return value
    .split(/\n{2,}/)
    .map(
      (block) =>
        `<p style="margin:0 0 12px;line-height:1.6;color:#574c43;">${escapeHtml(
          block,
        ).replace(/\n/g, "<br />")}</p>`,
    )
    .join("");
}

type LayoutInput = {
  title: string;
  preheader: string;
  body: string;
  contact: { phone: string; email: string; addressLines: string[] };
};

function layout({ title, preheader, body, contact }: LayoutInput): string {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${escapeHtml(title)}</title>
</head>
<body style="margin:0;padding:0;background-color:#f3ede4;font-family:Helvetica,Arial,sans-serif;color:#1e1815;">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;">${escapeHtml(preheader)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f3ede4;padding:32px 16px;">
  <tr>
    <td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;background-color:#ffffff;border:1px solid #e7dfd3;">
        <tr>
          <td style="padding:28px 32px 0;">
            <p style="margin:0;font-size:17px;letter-spacing:-0.01em;color:#1e1815;">${escapeHtml(site.name)}</p>
            <p style="margin:4px 0 0;font-size:12px;letter-spacing:0.08em;text-transform:uppercase;color:#857567;">${escapeHtml(site.tagline)}</p>
            <div style="height:1px;background-color:#a9482c;width:40px;margin:18px 0 0;"></div>
          </td>
        </tr>
        <tr>
          <td style="padding:24px 32px 32px;font-size:15px;">
            ${body}
          </td>
        </tr>
        <tr>
          <td style="padding:20px 32px 28px;border-top:1px solid #e7dfd3;font-size:13px;color:#857567;line-height:1.6;">
            <p style="margin:0 0 6px;color:#574c43;">${escapeHtml(site.name)}</p>
            <p style="margin:0;">${contact.addressLines.map(escapeHtml).join(", ")}</p>
            <p style="margin:6px 0 0;">
              ${escapeHtml(contact.phone)} &nbsp;&middot;&nbsp;
              <a href="mailto:${escapeHtml(contact.email)}" style="color:#83341e;">${escapeHtml(contact.email)}</a>
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

export type InquiryEmailItem = {
  productName: string;
  productCode: string;
  variantLabel: string | null;
  quantity: number;
  note: string | null;
};

export type InquiryEmailData = {
  reference: string;
  fullName: string;
  email: string;
  phone: string;
  companyName: string | null;
  projectName: string | null;
  projectLocation: string | null;
  message: string;
  additionalRequirements: string | null;
  items: InquiryEmailItem[];
  attachmentCount: number;
  createdAt: Date;
  contact: { phone: string; email: string; addressLines: string[] };
  /** Absolute link that opens the inquiry without needing an account. */
  trackUrl?: string;
};

function itemsTable(items: InquiryEmailItem[]): string {
  const rows = items
    .map(
      (item) => `
      <tr>
        <td style="padding:10px 0;border-bottom:1px solid #e7dfd3;vertical-align:top;">
          <p style="margin:0;color:#1e1815;">${escapeHtml(item.productName)}</p>
          <p style="margin:2px 0 0;font-size:12px;color:#857567;">
            ${escapeHtml(item.productCode)}${item.variantLabel ? `, ${escapeHtml(item.variantLabel)}` : ""}
          </p>
          ${
            item.note
              ? `<p style="margin:6px 0 0;font-size:13px;color:#574c43;">Note: ${escapeHtml(item.note)}</p>`
              : ""
          }
        </td>
        <td style="padding:10px 0;border-bottom:1px solid #e7dfd3;text-align:right;vertical-align:top;white-space:nowrap;color:#1e1815;">
          ${item.quantity}
        </td>
      </tr>`,
    )
    .join("");

  return `
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:8px 0 0;font-size:14px;">
    <tr>
      <th align="left" style="padding:0 0 8px;border-bottom:1px solid #d2c5b4;font-size:12px;letter-spacing:0.06em;text-transform:uppercase;color:#857567;font-weight:500;">Product</th>
      <th align="right" style="padding:0 0 8px;border-bottom:1px solid #d2c5b4;font-size:12px;letter-spacing:0.06em;text-transform:uppercase;color:#857567;font-weight:500;">Quantity</th>
    </tr>
    ${rows}
  </table>`;
}

function detailRow(label: string, value: string): string {
  return `
  <tr>
    <td style="padding:4px 16px 4px 0;color:#857567;white-space:nowrap;vertical-align:top;">${escapeHtml(label)}</td>
    <td style="padding:4px 0;color:#1e1815;">${escapeHtml(value)}</td>
  </tr>`;
}

function detailsTable(rows: Array<[string, string | null]>): string {
  const body = rows
    .filter((row): row is [string, string] => Boolean(row[1]))
    .map(([label, value]) => detailRow(label, value))
    .join("");

  return `<table role="presentation" cellpadding="0" cellspacing="0" style="font-size:14px;line-height:1.6;">${body}</table>`;
}

/** Sent to the customer the moment their inquiry is saved. */
export function inquiryConfirmation(data: InquiryEmailData) {
  const subject = `Inquiry ${data.reference} received | ${site.name}`;

  const body = `
    <p style="margin:0 0 16px;font-size:20px;line-height:1.3;color:#1e1815;">Thank you, ${escapeHtml(
      data.fullName.split(" ")[0] ?? data.fullName,
    )}</p>

    <p style="margin:0 0 16px;line-height:1.6;color:#574c43;">
      We have your inquiry and our team is looking at it now. Your reference number is below.
      Quote it if you call or write to us about this project.
    </p>

    <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 0 24px;border:1px solid #e7dfd3;background-color:#faf7f2;">
      <tr>
        <td style="padding:14px 18px;">
          <p style="margin:0;font-size:12px;letter-spacing:0.08em;text-transform:uppercase;color:#857567;">Inquiry reference</p>
          <p style="margin:4px 0 0;font-size:20px;letter-spacing:0.02em;color:#1e1815;">${escapeHtml(data.reference)}</p>
        </td>
      </tr>
    </table>

    <p style="margin:0 0 8px;font-size:12px;letter-spacing:0.08em;text-transform:uppercase;color:#857567;">Requested products</p>
    ${itemsTable(data.items)}

    <p style="margin:24px 0 8px;font-size:12px;letter-spacing:0.08em;text-transform:uppercase;color:#857567;">Your details</p>
    ${detailsTable([
      ["Name", data.fullName],
      ["Email", data.email],
      ["Phone", data.phone],
      ["Company", data.companyName],
      ["Project", data.projectName],
      ["Location", data.projectLocation],
      [
        "Attachments",
        data.attachmentCount > 0
          ? `${data.attachmentCount} ${data.attachmentCount === 1 ? "file" : "files"}`
          : null,
      ],
    ])}

    <p style="margin:24px 0 8px;font-size:12px;letter-spacing:0.08em;text-transform:uppercase;color:#857567;">Your message</p>
    ${paragraphs(data.message)}
    ${
      data.additionalRequirements
        ? `<p style="margin:16px 0 8px;font-size:12px;letter-spacing:0.08em;text-transform:uppercase;color:#857567;">Additional requirements</p>${paragraphs(
            data.additionalRequirements,
          )}`
        : ""
    }

    <p style="margin:24px 0 8px;font-size:12px;letter-spacing:0.08em;text-transform:uppercase;color:#857567;">What happens next</p>
    <p style="margin:0 0 16px;line-height:1.6;color:#574c43;">
      A member of our team will confirm availability, lead times and pricing, usually within
      one working day. Their reply will arrive by email and you can answer it directly.
    </p>

    ${
      data.trackUrl
        ? `<p style="margin:0 0 8px;">
             <a href="${escapeHtml(data.trackUrl)}" style="display:inline-block;background-color:#1e1815;color:#ffffff;text-decoration:none;padding:11px 20px;font-size:14px;">Open your inquiry</a>
           </p>
           <p style="margin:8px 0 0;font-size:13px;color:#857567;">
             This link opens your inquiry and its conversation. Keep it private, because
             anyone who has it can read the inquiry.
           </p>`
        : ""
    }

    <p style="margin:24px 0 0;line-height:1.6;color:#574c43;">
      A summary of this inquiry is attached for your records.
    </p>
  `;

  const text = [
    `Thank you, ${data.fullName}.`,
    "",
    `We have your inquiry and our team is looking at it now.`,
    `Inquiry reference: ${data.reference}`,
    "",
    "Requested products:",
    ...data.items.map(
      (item) =>
        `  ${item.quantity} x ${item.productName} (${item.productCode}${
          item.variantLabel ? `, ${item.variantLabel}` : ""
        })${item.note ? `\n    Note: ${item.note}` : ""}`,
    ),
    "",
    "Your details:",
    `  Name: ${data.fullName}`,
    `  Email: ${data.email}`,
    `  Phone: ${data.phone}`,
    data.companyName ? `  Company: ${data.companyName}` : null,
    data.projectName ? `  Project: ${data.projectName}` : null,
    data.projectLocation ? `  Location: ${data.projectLocation}` : null,
    "",
    "Your message:",
    data.message,
    data.additionalRequirements ? `\nAdditional requirements:\n${data.additionalRequirements}` : null,
    "",
    "A member of our team will confirm availability, lead times and pricing, usually within one working day.",
    data.trackUrl ? `\nOpen your inquiry: ${data.trackUrl}` : null,
    "",
    site.name,
    data.contact.addressLines.join(", "),
    `${data.contact.phone}  ${data.contact.email}`,
  ]
    .filter((line) => line !== null)
    .join("\n");

  return {
    subject,
    html: layout({
      title: subject,
      preheader: `Your inquiry reference is ${data.reference}.`,
      body,
      contact: data.contact,
    }),
    text,
  };
}

/** Sent to the team so a new inquiry is not waiting unseen in the dashboard. */
export function managerNotification(data: InquiryEmailData & { manageUrl: string }) {
  const subject = `New inquiry ${data.reference} from ${data.fullName}`;

  const body = `
    <p style="margin:0 0 16px;font-size:20px;line-height:1.3;color:#1e1815;">New inquiry received</p>

    ${detailsTable([
      ["Reference", data.reference],
      ["Received", data.createdAt.toISOString().slice(0, 16).replace("T", " ")],
      ["Name", data.fullName],
      ["Email", data.email],
      ["Phone", data.phone],
      ["Company", data.companyName],
      ["Project", data.projectName],
      ["Location", data.projectLocation],
      ["Products", String(data.items.length)],
      [
        "Attachments",
        data.attachmentCount > 0 ? String(data.attachmentCount) : null,
      ],
    ])}

    <p style="margin:24px 0 8px;font-size:12px;letter-spacing:0.08em;text-transform:uppercase;color:#857567;">Requested products</p>
    ${itemsTable(data.items)}


    <p style="margin:24px 0 8px;font-size:12px;letter-spacing:0.08em;text-transform:uppercase;color:#857567;">Customer message</p>
    ${paragraphs(data.message)}
    ${data.additionalRequirements ? paragraphs(data.additionalRequirements) : ""}

    <p style="margin:24px 0 0;">
      <a href="${escapeHtml(data.manageUrl)}" style="display:inline-block;background-color:#1e1815;color:#ffffff;text-decoration:none;padding:11px 20px;font-size:14px;">Open in the manager platform</a>
    </p>
  `;

  const text = [
    `New inquiry ${data.reference} from ${data.fullName}`,
    "",
    `Email: ${data.email}`,
    `Phone: ${data.phone}`,
    data.companyName ? `Company: ${data.companyName}` : null,
    data.projectName ? `Project: ${data.projectName}` : null,
    "",
    "Products:",
    ...data.items.map(
      (item) => `  ${item.quantity} x ${item.productName} (${item.productCode})`,
    ),
    "",
    "Message:",
    data.message,
    "",
    `Open: ${data.manageUrl}`,
  ]
    .filter((line) => line !== null)
    .join("\n");

  return {
    subject,
    html: layout({
      title: subject,
      preheader: `${data.items.length} products from ${data.fullName}.`,
      body,
      contact: data.contact,
    }),
    text,
  };
}
