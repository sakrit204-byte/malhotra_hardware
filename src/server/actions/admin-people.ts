"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { emptyAuthState, type AuthFormState } from "@/lib/auth-form";
import { requireRole } from "@/server/auth/guards";
import { hashPassword } from "@/server/auth/password";
import { destroyAllSessions } from "@/server/auth/session";
import { issueToken } from "@/server/auth/tokens";
import { prisma } from "@/server/db/prisma";
import { passwordResetTemplate } from "@/server/email/auth-templates";
import { sendEmail } from "@/server/email/mailer";
import { env } from "@/server/env";
import { getContactContent } from "@/server/repositories/content";
import { recordAudit } from "@/server/services/audit";

/**
 * People.
 *
 * Three guards run through every action here, because this is where an account
 * can be handed the keys to the whole platform.
 *
 * 1. **Only an administrator.** Checked against the database on every call.
 * 2. **Nobody edits themselves.** An administrator cannot change their own role
 *    or disable their own account, which is what stops one careless click from
 *    locking the last administrator out of their own system.
 * 3. **The last administrator stays.** Removing the final administrator role is
 *    refused outright.
 */

const inviteSchema = z.object({
  fullName: z.string().trim().min(2, "Give them a name.").max(120),
  email: z
    .string()
    .trim()
    .toLowerCase()
    .max(200)
    .pipe(z.email("That email address does not look right.")),
  role: z.enum(["MANAGER", "ADMIN"]),
  phone: z
    .string()
    .trim()
    .max(40)
    .optional()
    .transform((value) => (value && value.length > 0 ? value : null)),
});

/**
 * Creates a colleague's account.
 *
 * No password is chosen here. A long random one is stored so the account is
 * never usable without it, and the person sets their own through the reset link
 * they are emailed. That way a password is never typed by one person for
 * another, and never travels through this form.
 */
/**
 * What was typed, given back verbatim.
 *
 * React empties a form once its action has run, so without this a rejected
 * submission would clear the fields the person had just filled in.
 */
function submittedInvite(formData: FormData): Record<string, string> {
  const values: Record<string, string> = {};

  for (const field of ["fullName", "email", "phone", "role"]) {
    values[field] = String(formData.get(field) ?? "");
  }

  return values;
}

export async function inviteStaffAction(
  _previous: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const admin = await requireRole("ADMIN");

  const parsed = inviteSchema.safeParse({
    fullName: formData.get("fullName") ?? "",
    email: formData.get("email") ?? "",
    role: formData.get("role") ?? "MANAGER",
    phone: formData.get("phone") ?? "",
  });

  if (!parsed.success) {
    const errors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const field = issue.path[0];
      if (typeof field === "string" && !(field in errors))
        errors[field] = issue.message;
    }
    return { status: "error", values: submittedInvite(formData), errors };
  }

  const data = parsed.data;

  const existing = await prisma.user.findFirst({
    where: { email: data.email, deletedAt: null },
    select: { id: true, role: true, fullName: true },
  });

  if (existing) {
    return {
      status: "error",
      values: submittedInvite(formData),
      errors: {
        email: `${existing.fullName} already has an account with that address. Change their role below instead.`,
      },
    };
  }

  try {
    const unusable = `${crypto.randomUUID()}${crypto.randomUUID()}`;

    const created = await prisma.user.create({
      data: {
        email: data.email,
        fullName: data.fullName,
        phone: data.phone,
        role: data.role,
        passwordHash: await hashPassword(unusable),
        // A colleague's address is confirmed by the administrator adding them.
        emailVerifiedAt: new Date(),
      },
      select: { id: true, fullName: true },
    });

    const [contact, token] = await Promise.all([
      getContactContent(),
      issueToken({
        type: "PASSWORD_RESET",
        email: data.email,
        userId: created.id,
        lifetimeSeconds: 60 * 60 * 48,
      }),
    ]);

    const message = passwordResetTemplate({
      fullName: created.fullName,
      resetUrl: `${env.APP_URL}/reset/confirm?token=${encodeURIComponent(token.token)}`,
      minutes: 48 * 60,
      contact,
    });

    await sendEmail({
      to: data.email,
      subject: `Set up your ${data.role === "ADMIN" ? "administrator" : "manager"} account`,
      html: message.html,
      text: message.text,
      template: "staffInvite",
    });

    await recordAudit({
      actor: admin,
      action: "staff.invited",
      entityType: "User",
      entityId: created.id,
      summary: `Added ${data.fullName} as ${data.role === "ADMIN" ? "an administrator" : "a manager"}`,
    });

    revalidatePath("/admin/users");

    return {
      ...emptyAuthState,
      status: "sent",
      message: `${data.fullName} has been added and emailed a link to set their password.`,
    };
  } catch (error) {
    console.error("Could not add the colleague", error);
    return {
      status: "error",
      values: submittedInvite(formData),
      errors: { form: "That account could not be created. Please try again." },
    };
  }
}

export async function changeRoleAction(formData: FormData): Promise<void> {
  const admin = await requireRole("ADMIN");

  const parsed = z
    .object({
      userId: z.string().min(1).max(60),
      role: z.enum(["USER", "MANAGER", "ADMIN"]),
    })
    .safeParse({
      userId: formData.get("userId") ?? "",
      role: formData.get("role") ?? "",
    });

  if (!parsed.success) return;

  // Nobody changes their own role. One careless click should not be able to
  // demote the person making it.
  if (parsed.data.userId === admin.id) return;

  const target = await prisma.user.findUnique({
    where: { id: parsed.data.userId },
    select: { fullName: true, role: true },
  });

  if (!target || target.role === parsed.data.role) return;

  if (target.role === "ADMIN" && parsed.data.role !== "ADMIN") {
    const remaining = await prisma.user.count({
      where: {
        role: "ADMIN",
        isActive: true,
        deletedAt: null,
        id: { not: parsed.data.userId },
      },
    });

    if (remaining === 0) return;
  }

  await prisma.user.update({
    where: { id: parsed.data.userId },
    data: { role: parsed.data.role },
  });

  // A change of role changes what every open session is allowed to do, so the
  // sessions go and the person signs in again under the new one.
  await destroyAllSessions(parsed.data.userId);

  await recordAudit({
    actor: admin,
    action: "staff.roleChanged",
    entityType: "User",
    entityId: parsed.data.userId,
    summary: `${target.fullName} moved from ${target.role} to ${parsed.data.role}`,
    before: { role: target.role },
    after: { role: parsed.data.role },
  });

  revalidatePath("/admin/users");
}

export async function toggleUserActiveAction(
  formData: FormData,
): Promise<void> {
  const admin = await requireRole("ADMIN");
  const userId = String(formData.get("userId") ?? "");
  if (!userId || userId === admin.id) return;

  const target = await prisma.user.findUnique({
    where: { id: userId },
    select: { fullName: true, isActive: true, role: true },
  });

  if (!target) return;

  if (target.isActive && target.role === "ADMIN") {
    const remaining = await prisma.user.count({
      where: {
        role: "ADMIN",
        isActive: true,
        deletedAt: null,
        id: { not: userId },
      },
    });

    if (remaining === 0) return;
  }

  await prisma.user.update({
    where: { id: userId },
    data: { isActive: !target.isActive },
  });

  if (target.isActive) {
    // Disabling means disabled now, not at the next session expiry.
    await destroyAllSessions(userId);
  }

  await recordAudit({
    actor: admin,
    action: target.isActive ? "user.disabled" : "user.enabled",
    entityType: "User",
    entityId: userId,
    summary: `${target.isActive ? "Disabled" : "Enabled"} ${target.fullName}`,
  });

  revalidatePath("/admin/users");
}

/** Sends somebody a link to set a new password. */
export async function sendStaffResetAction(formData: FormData): Promise<void> {
  const admin = await requireRole("ADMIN");
  const userId = String(formData.get("userId") ?? "");
  if (!userId) return;

  const target = await prisma.user.findFirst({
    where: { id: userId, deletedAt: null, isActive: true },
    select: { id: true, email: true, fullName: true },
  });

  if (!target) return;

  const [contact, token] = await Promise.all([
    getContactContent(),
    issueToken({
      type: "PASSWORD_RESET",
      email: target.email,
      userId: target.id,
      lifetimeSeconds: 60 * 60 * 2,
    }),
  ]);

  const message = passwordResetTemplate({
    fullName: target.fullName,
    resetUrl: `${env.APP_URL}/reset/confirm?token=${encodeURIComponent(token.token)}`,
    minutes: 120,
    contact,
  });

  await sendEmail({
    to: target.email,
    subject: message.subject,
    html: message.html,
    text: message.text,
    template: "passwordReset",
  });

  await recordAudit({
    actor: admin,
    action: "staff.resetSent",
    entityType: "User",
    entityId: target.id,
    summary: `Sent ${target.fullName} a password reset link`,
  });

  revalidatePath("/admin/users");
}
