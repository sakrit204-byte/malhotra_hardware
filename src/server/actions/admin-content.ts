"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { emptyAuthState, type AuthFormState } from "@/lib/auth-form";
import { requireRole } from "@/server/auth/guards";
import { prisma } from "@/server/db/prisma";
import { recordAudit } from "@/server/services/audit";

/**
 * Editable site content.
 *
 * The home page copy, the hero photograph, the points marked on it and the
 * contact details all live as rows. This is the difference between a business
 * that can change its own phone number and one that has to ask.
 *
 * Content is stored as JSON, so the form posts JSON and it is parsed and
 * checked here. A malformed edit is refused with the reason rather than saved
 * and left to break a page later.
 */

export async function saveSiteContentAction(
  _previous: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const admin = await requireRole("ADMIN");

  const parsed = z
    .object({
      key: z.string().trim().min(1).max(80),
      value: z.string().min(2).max(20000),
    })
    .safeParse({
      key: formData.get("key") ?? "",
      value: formData.get("value") ?? "",
    });

  if (!parsed.success) {
    return {
      status: "error",
      values: { value: String(formData.get("value") ?? "") },
      errors: { form: "That content could not be saved." },
    };
  }

  let value: unknown;

  try {
    value = JSON.parse(parsed.data.value);
  } catch {
    return {
      status: "error",
      values: { value: parsed.data.value },
      errors: {
        value:
          "That is not valid JSON. Check for a missing comma, a trailing comma or an unclosed bracket.",
      },
    };
  }

  if (value === null || typeof value !== "object") {
    return {
      status: "error",
      values: { value: parsed.data.value },
      errors: { value: "Content has to be an object, wrapped in braces." },
    };
  }

  const existing = await prisma.siteContent.findUnique({
    where: { key: parsed.data.key },
    select: { value: true, description: true },
  });

  await prisma.siteContent.upsert({
    where: { key: parsed.data.key },
    create: {
      key: parsed.data.key,
      value: value as object,
      updatedById: admin.id,
    },
    update: { value: value as object, updatedById: admin.id },
  });

  await recordAudit({
    actor: admin,
    action: "content.updated",
    entityType: "SiteContent",
    entityId: parsed.data.key,
    summary: `Updated the content block ${parsed.data.key}`,
    before: existing?.value,
    after: value,
  });

  // Content appears on the home page, the contact page and in emails, so the
  // whole public site is refreshed rather than guessing which pages use it.
  revalidatePath("/", "layout");

  return { ...emptyAuthState, status: "sent", message: "Saved and live." };
}
