import "server-only";

import { prisma } from "@/server/db/prisma";
import { env } from "@/server/env";
import {
  createSession,
  destroyAllSessions,
  destroySession,
} from "@/server/auth/session";
import { hashPassword, needsRehash, verifyPassword } from "@/server/auth/password";
import { consumeToken, findValidToken, issueToken } from "@/server/auth/tokens";
import {
  accountExistsTemplate,
  passwordChangedTemplate,
  passwordResetTemplate,
  verifyEmailTemplate,
} from "@/server/email/auth-templates";
import { sendEmail } from "@/server/email/mailer";
import { claimInquiriesForVerifiedEmail } from "@/server/inquiry/access";
import { getContactContent } from "@/server/repositories/content";
import type { LoginValues, RegisterValues } from "@/server/validation/auth";

/**
 * Accounts.
 *
 * An account is a convenience here, never a gate: a customer can send an
 * inquiry, receive a reference and hold a conversation without ever creating
 * one. What an account adds is one place to see every inquiry.
 *
 * The rules that shape this module:
 *
 * **Nothing reveals who has an account.** Registering with an address that is
 * already taken produces the same screen as registering with a new one, and the
 * owner of the address is told by email. Asking for a password reset produces
 * the same screen whether or not the address exists. Signing in with a wrong
 * password and signing in with an unknown address give the same message, after
 * the same amount of work.
 *
 * **Verification is what links a guest inquiry to an account.** Guest inquiries
 * are attached only once the address has been proved, never on the strength of
 * someone typing it into a form.
 *
 * **A password change ends every session.** If a password is being changed
 * because it was stolen, leaving the thief signed in would defeat the point.
 */

const VERIFICATION_HOURS = 24;
const RESET_MINUTES = 60;

/**
 * A hash to check against when no account exists, so that signing in with an
 * unknown address costs the same time as signing in with a known one. Without
 * it, response time alone tells an attacker which addresses are registered.
 */
const DECOY_HASH_PROMISE = hashPassword("a password that is never anyone's");

export type RegisterResult =
  | { ok: true; requiresVerification: true }
  | { ok: false; error: string };

export async function registerAccount(
  values: RegisterValues,
  context: { ipAddress: string | null },
): Promise<RegisterResult> {
  const email = values.email.toLowerCase();
  const contact = await getContactContent();

  const existing = await prisma.user.findFirst({
    where: { email, deletedAt: null },
    select: { id: true, emailVerifiedAt: true },
  });

  if (existing) {
    // The screen the visitor sees is identical either way. Only the owner of
    // the address learns that it is already registered.
    const reset = await issueToken({
      type: "PASSWORD_RESET",
      email,
      userId: existing.id,
      lifetimeSeconds: RESET_MINUTES * 60,
    }).catch(() => null);

    const message = accountExistsTemplate({
      loginUrl: `${env.APP_URL}/login`,
      resetUrl: reset
        ? `${env.APP_URL}/reset/confirm?token=${encodeURIComponent(reset.token)}`
        : `${env.APP_URL}/reset`,
      contact,
    });

    await sendEmail({
      to: email,
      subject: message.subject,
      html: message.html,
      text: message.text,
      template: "accountExists",
    });

    return { ok: true, requiresVerification: true };
  }

  try {
    const user = await prisma.user.create({
      data: {
        email,
        passwordHash: await hashPassword(values.password),
        fullName: values.fullName,
        phone: values.phone ?? null,
        companyName: values.companyName ?? null,
        role: "USER",
      },
      select: { id: true, fullName: true },
    });

    // How many inquiries are waiting to be attached once the address is proved.
    const pendingInquiries = await prisma.inquiry.count({
      where: { email, userId: null },
    });

    const token = await issueToken({
      type: "EMAIL_VERIFICATION",
      email,
      userId: user.id,
      lifetimeSeconds: VERIFICATION_HOURS * 60 * 60,
    });

    const message = verifyEmailTemplate({
      fullName: user.fullName,
      verifyUrl: `${env.APP_URL}/verify?token=${encodeURIComponent(token.token)}`,
      hours: VERIFICATION_HOURS,
      pendingInquiries,
      contact,
    });

    await sendEmail({
      to: email,
      subject: message.subject,
      html: message.html,
      text: message.text,
      template: "verifyEmail",
    });

    await prisma.auditLog.create({
      data: {
        actor: { connect: { id: user.id } },
        actorEmail: email,
        actorRole: "USER",
        action: "account.registered",
        entityType: "User",
        entityId: user.id,
        summary: "Account created, awaiting email verification",
        ipAddress: context.ipAddress,
      },
    });

    return { ok: true, requiresVerification: true };
  } catch (error) {
    console.error("Could not register account", error);
    return {
      ok: false,
      error:
        "We could not create your account just now. Please try again, or call us and we will help.",
    };
  }
}

export type LoginResult =
  | { ok: true; needsVerification: boolean }
  | { ok: false; error: string };

const SIGN_IN_REFUSAL =
  "That email address and password do not match an account. Please check both and try again.";

export async function signIn(
  values: LoginValues,
  context: { ipAddress: string | null; userAgent: string | null },
): Promise<LoginResult> {
  const email = values.email.toLowerCase();

  const user = await prisma.user.findFirst({
    where: { email, deletedAt: null },
    select: {
      id: true,
      passwordHash: true,
      isActive: true,
      emailVerifiedAt: true,
      role: true,
    },
  });

  if (!user) {
    // Do the same work anyway, so an unknown address is indistinguishable from
    // a wrong password by timing.
    await verifyPassword(values.password, await DECOY_HASH_PROMISE);
    return { ok: false, error: SIGN_IN_REFUSAL };
  }

  const correct = await verifyPassword(values.password, user.passwordHash);

  if (!correct) {
    return { ok: false, error: SIGN_IN_REFUSAL };
  }

  if (!user.isActive) {
    return {
      ok: false,
      error:
        "This account has been closed. Please call us and we will sort it out with you.",
    };
  }

  // A correct password on an old hash is the one moment we can upgrade it
  // without asking the customer for anything.
  if (needsRehash(user.passwordHash)) {
    await prisma.user
      .update({
        where: { id: user.id },
        data: { passwordHash: await hashPassword(values.password) },
      })
      .catch(() => undefined);
  }

  await createSession(user.id, context);

  await prisma.user.update({
    where: { id: user.id },
    data: { lastLoginAt: new Date() },
  });

  return { ok: true, needsVerification: user.emailVerifiedAt === null };
}

export async function signOut(): Promise<void> {
  await destroySession();
}

export type VerificationResult =
  | { ok: true; claimed: number; alreadyVerified: boolean }
  | { ok: false; error: string };

/**
 * Confirms an email address.
 *
 * This is the moment a guest becomes an account holder, so it is also the only
 * moment guest inquiries are attached: the address has now been proved to
 * belong to whoever holds the mailbox.
 */
export async function verifyEmail(
  token: string,
  context: { ipAddress: string | null; userAgent: string | null },
): Promise<VerificationResult> {
  const record = await findValidToken(token, "EMAIL_VERIFICATION");

  if (!record?.userId) {
    return {
      ok: false,
      error:
        "This confirmation link is not valid any more. It may have expired or already been used. Ask for a new one below.",
    };
  }

  const user = await prisma.user.findFirst({
    where: { id: record.userId, deletedAt: null },
    select: { id: true, email: true, emailVerifiedAt: true, isActive: true },
  });

  if (!user || !user.isActive) {
    return { ok: false, error: "This confirmation link is not valid any more." };
  }

  await consumeToken(record.id);

  const alreadyVerified = user.emailVerifiedAt !== null;

  if (!alreadyVerified) {
    await prisma.user.update({
      where: { id: user.id },
      data: { emailVerifiedAt: new Date() },
    });
  }

  const claimed = await claimInquiriesForVerifiedEmail(user.id, user.email);

  // Confirming the address signs the customer in. They have just proved they
  // hold the mailbox, and asking them to type a password now helps nobody.
  await createSession(user.id, context);

  await prisma.auditLog.create({
    data: {
      actor: { connect: { id: user.id } },
      actorEmail: user.email,
      actorRole: "USER",
      action: "account.verified",
      entityType: "User",
      entityId: user.id,
      summary:
        claimed > 0
          ? `Email verified, ${claimed} guest ${claimed === 1 ? "inquiry" : "inquiries"} attached`
          : "Email verified",
      ipAddress: context.ipAddress,
    },
  });

  return { ok: true, claimed, alreadyVerified };
}

/** Sends another confirmation link. Says the same thing whatever it finds. */
export async function resendVerification(email: string): Promise<void> {
  const normalised = email.toLowerCase();

  const user = await prisma.user.findFirst({
    where: { email: normalised, deletedAt: null, emailVerifiedAt: null },
    select: { id: true, fullName: true },
  });

  if (!user) return;

  const [contact, pendingInquiries] = await Promise.all([
    getContactContent(),
    prisma.inquiry.count({ where: { email: normalised, userId: null } }),
  ]);

  const token = await issueToken({
    type: "EMAIL_VERIFICATION",
    email: normalised,
    userId: user.id,
    lifetimeSeconds: VERIFICATION_HOURS * 60 * 60,
  });

  const message = verifyEmailTemplate({
    fullName: user.fullName,
    verifyUrl: `${env.APP_URL}/verify?token=${encodeURIComponent(token.token)}`,
    hours: VERIFICATION_HOURS,
    pendingInquiries,
    contact,
  });

  await sendEmail({
    to: normalised,
    subject: message.subject,
    html: message.html,
    text: message.text,
    template: "verifyEmail",
  });
}

/** Starts a password reset. Reveals nothing about whether the address exists. */
export async function requestPasswordReset(email: string): Promise<void> {
  const normalised = email.toLowerCase();

  const user = await prisma.user.findFirst({
    where: { email: normalised, deletedAt: null, isActive: true },
    select: { id: true, fullName: true },
  });

  if (!user) return;

  const contact = await getContactContent();

  const token = await issueToken({
    type: "PASSWORD_RESET",
    email: normalised,
    userId: user.id,
    lifetimeSeconds: RESET_MINUTES * 60,
  });

  const message = passwordResetTemplate({
    fullName: user.fullName,
    resetUrl: `${env.APP_URL}/reset/confirm?token=${encodeURIComponent(token.token)}`,
    minutes: RESET_MINUTES,
    contact,
  });

  await sendEmail({
    to: normalised,
    subject: message.subject,
    html: message.html,
    text: message.text,
    template: "passwordReset",
  });
}

export type ResetResult = { ok: true } | { ok: false; error: string };

export async function completePasswordReset(
  token: string,
  newPassword: string,
  context: { ipAddress: string | null; userAgent: string | null },
): Promise<ResetResult> {
  const record = await findValidToken(token, "PASSWORD_RESET");

  if (!record?.userId) {
    return {
      ok: false,
      error:
        "This link is not valid any more. It may have expired or already been used. Ask for a new one and we will send another.",
    };
  }

  const user = await prisma.user.findFirst({
    where: { id: record.userId, deletedAt: null, isActive: true },
    select: { id: true, email: true, fullName: true, emailVerifiedAt: true },
  });

  if (!user) {
    return { ok: false, error: "This link is not valid any more." };
  }

  await consumeToken(record.id);

  await prisma.user.update({
    where: { id: user.id },
    data: {
      passwordHash: await hashPassword(newPassword),
      // Holding the reset link proves the address as surely as a confirmation
      // link does, so an unverified account becomes verified here.
      emailVerifiedAt: user.emailVerifiedAt ?? new Date(),
    },
  });

  // Every existing session goes, including any belonging to whoever prompted
  // the reset. Then a fresh one for the person who just proved themselves.
  await destroyAllSessions(user.id);
  await claimInquiriesForVerifiedEmail(user.id, user.email);
  await createSession(user.id, context);

  const contact = await getContactContent();
  const message = passwordChangedTemplate({ fullName: user.fullName, contact });

  await sendEmail({
    to: user.email,
    subject: message.subject,
    html: message.html,
    text: message.text,
    template: "passwordChanged",
  });

  await prisma.auditLog.create({
    data: {
      actor: { connect: { id: user.id } },
      actorEmail: user.email,
      actorRole: "USER",
      action: "account.passwordReset",
      entityType: "User",
      entityId: user.id,
      summary: "Password reset and all other sessions ended",
      ipAddress: context.ipAddress,
    },
  });

  return { ok: true };
}
