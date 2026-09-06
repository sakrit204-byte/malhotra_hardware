import "server-only";

import { site } from "@/lib/site";
import { escapeHtml } from "@/server/email/templates";

/**
 * Account emails.
 *
 * Short, plain and unmistakably transactional. Each one states what was asked
 * for, what to do, and how long the link lasts, because a customer who did not
 * ask for it needs to be able to tell that at a glance.
 */

type Contact = { phone: string; email: string; addressLines: string[] };

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
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background-color:#ffffff;border:1px solid #e7dfd3;">
        <tr>
          <td style="padding:28px 32px 0;">
            <p style="margin:0;font-size:17px;color:#1e1815;">${escapeHtml(site.name)}</p>
            <p style="margin:4px 0 0;font-size:12px;letter-spacing:0.08em;text-transform:uppercase;color:#857567;">${escapeHtml(site.tagline)}</p>
            <div style="height:1px;background-color:#a9482c;width:40px;margin:18px 0 0;"></div>
          </td>
        </tr>
        <tr><td style="padding:24px 32px 32px;font-size:15px;line-height:1.6;">${input.body}</td></tr>
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

function button(href: string, label: string): string {
  return `<p style="margin:24px 0;">
    <a href="${escapeHtml(href)}" style="display:inline-block;background-color:#1e1815;color:#ffffff;text-decoration:none;padding:12px 22px;font-size:15px;">${escapeHtml(label)}</a>
  </p>
  <p style="margin:0 0 4px;font-size:13px;color:#857567;">If the button does not work, copy this address into your browser:</p>
  <p style="margin:0;font-size:13px;word-break:break-all;"><a href="${escapeHtml(href)}" style="color:#83341e;">${escapeHtml(href)}</a></p>`;
}

/** Sent when someone creates an account and has to prove the address is theirs. */
export function verifyEmailTemplate(input: {
  fullName: string;
  verifyUrl: string;
  hours: number;
  contact: Contact;
  pendingInquiries: number;
}) {
  const subject = `Confirm your email address | ${site.name}`;

  const body = `
    <p style="margin:0 0 16px;font-size:19px;line-height:1.3;">Welcome, ${escapeHtml(
      input.fullName.split(" ")[0] ?? input.fullName,
    )}</p>
    <p style="margin:0 0 8px;color:#574c43;">
      Confirm this address and your account is ready. The link works for ${input.hours} hours.
    </p>
    ${button(input.verifyUrl, "Confirm my email address")}
    ${
      input.pendingInquiries > 0
        ? `<p style="margin:24px 0 0;color:#574c43;">Once confirmed, the ${input.pendingInquiries} ${
            input.pendingInquiries === 1 ? "inquiry" : "inquiries"
          } you have already sent from this address will appear in your account.</p>`
        : ""
    }
    <p style="margin:20px 0 0;font-size:13px;color:#857567;">
      If you did not create an account with us, you can ignore this message and nothing will happen.
    </p>`;

  const text = [
    `Welcome, ${input.fullName}.`,
    "",
    `Confirm your email address to finish setting up your account. The link works for ${input.hours} hours.`,
    "",
    input.verifyUrl,
    "",
    input.pendingInquiries > 0
      ? `Once confirmed, the ${input.pendingInquiries} inquiry or inquiries you have already sent from this address will appear in your account.`
      : null,
    "",
    "If you did not create an account with us, you can ignore this message.",
    "",
    site.name,
    input.contact.addressLines.join(", "),
  ]
    .filter((line) => line !== null)
    .join("\n");

  return {
    subject,
    html: layout({
      title: subject,
      preheader: "Confirm your email address to finish setting up your account.",
      body,
      contact: input.contact,
    }),
    text,
  };
}

/**
 * Sent when someone tries to register with an address that already has an
 * account. The registration form itself says the same thing to everyone, so
 * nobody can use it to discover which addresses are registered. This message
 * goes only to the person who actually owns the address.
 */
export function accountExistsTemplate(input: {
  resetUrl: string;
  loginUrl: string;
  contact: Contact;
}) {
  const subject = `About your account | ${site.name}`;

  const body = `
    <p style="margin:0 0 16px;font-size:19px;line-height:1.3;">You already have an account</p>
    <p style="margin:0 0 8px;color:#574c43;">
      Somebody just tried to create an account with this address. There is already one here, so
      nothing has changed and no new account was made.
    </p>
    <p style="margin:0 0 8px;color:#574c43;">
      If that was you, sign in instead. If you have forgotten your password, you can set a new one.
    </p>
    ${button(input.loginUrl, "Sign in")}
    <p style="margin:20px 0 0;font-size:13px;color:#857567;">
      Set a new password: <a href="${escapeHtml(input.resetUrl)}" style="color:#83341e;">${escapeHtml(input.resetUrl)}</a>
    </p>
    <p style="margin:12px 0 0;font-size:13px;color:#857567;">
      If this was not you, no action is needed. Your account is untouched.
    </p>`;

  const text = [
    "You already have an account with this address.",
    "",
    "Somebody just tried to create an account with it. Nothing has changed and no new account was made.",
    "",
    `Sign in: ${input.loginUrl}`,
    `Set a new password: ${input.resetUrl}`,
    "",
    "If this was not you, no action is needed.",
    "",
    site.name,
  ].join("\n");

  return {
    subject,
    html: layout({
      title: subject,
      preheader: "There is already an account with this address.",
      body,
      contact: input.contact,
    }),
    text,
  };
}

/** Sent when someone asks to set a new password. */
export function passwordResetTemplate(input: {
  fullName: string;
  resetUrl: string;
  minutes: number;
  contact: Contact;
}) {
  const subject = `Set a new password | ${site.name}`;

  const body = `
    <p style="margin:0 0 16px;font-size:19px;line-height:1.3;">Set a new password</p>
    <p style="margin:0 0 8px;color:#574c43;">
      Use the link below to choose a new password. It works once and expires in ${input.minutes} minutes.
    </p>
    ${button(input.resetUrl, "Set a new password")}
    <p style="margin:24px 0 0;font-size:13px;color:#857567;">
      If you did not ask for this, ignore this message. Your password stays as it is, and
      whoever asked cannot see it.
    </p>`;

  const text = [
    `Set a new password for your ${site.name} account.`,
    "",
    `The link works once and expires in ${input.minutes} minutes.`,
    "",
    input.resetUrl,
    "",
    "If you did not ask for this, ignore this message. Your password stays as it is.",
    "",
    site.name,
  ].join("\n");

  return {
    subject,
    html: layout({
      title: subject,
      preheader: `Your password reset link, valid for ${input.minutes} minutes.`,
      body,
      contact: input.contact,
    }),
    text,
  };
}

/** Sent after a password actually changes, so a theft cannot go unnoticed. */
export function passwordChangedTemplate(input: {
  fullName: string;
  contact: Contact;
}) {
  const subject = `Your password was changed | ${site.name}`;

  const body = `
    <p style="margin:0 0 16px;font-size:19px;line-height:1.3;">Your password was changed</p>
    <p style="margin:0 0 8px;color:#574c43;">
      The password on your account has just been changed, and you have been signed out
      everywhere else.
    </p>
    <p style="margin:16px 0 0;color:#574c43;">
      If this was not you, call us on ${escapeHtml(input.contact.phone)} straight away.
    </p>`;

  const text = [
    "The password on your account has just been changed, and you have been signed out everywhere else.",
    "",
    `If this was not you, call us on ${input.contact.phone} straight away.`,
    "",
    site.name,
  ].join("\n");

  return {
    subject,
    html: layout({
      title: subject,
      preheader: "The password on your account has just been changed.",
      body,
      contact: input.contact,
    }),
    text,
  };
}
