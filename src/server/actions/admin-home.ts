"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { emptyAuthState, type AuthFormState } from "@/lib/auth-form";
import { requireRole } from "@/server/auth/guards";
import type { SessionUser } from "@/server/auth/session";
import { prisma } from "@/server/db/prisma";
import { recordAudit } from "@/server/services/audit";

/**
 * The home page, arranged from a screen instead of from a file.
 *
 * Before this, changing the headline meant editing JSON, and changing which
 * products appeared meant finding each one and ticking a box in an editor with
 * no sense of the row it was joining. Both were jobs for somebody who could
 * read code. Here the whole page is a form.
 *
 * The arrangement is stored as lists of codes and slugs in site content, and
 * the eligibility flags on the products are kept in step with it, so the two
 * ways of saying the same thing can never disagree.
 */

/** Writes one block of site content and records who changed it. */
async function writeContent(
  key: string,
  value: object,
  actor: SessionUser,
  summary: string,
) {
  const existing = await prisma.siteContent.findUnique({
    where: { key },
    select: { value: true },
  });

  await prisma.siteContent.upsert({
    where: { key },
    create: { key, value, updatedById: actor.id },
    update: { value, updatedById: actor.id },
  });

  await recordAudit({
    actor,
    action: "content.updated",
    entityType: "SiteContent",
    entityId: key,
    summary,
    before: existing?.value,
    after: value,
  });

  // The home page, the header and the footer all read this, so the whole
  // public site is refreshed rather than guessing which pages use it.
  revalidatePath("/", "layout");
}

const heroSchema = z.object({
  eyebrow: z.string().trim().min(2, "Give the strip above the headline some words.").max(80),
  headline: z.string().trim().min(4, "The headline cannot be empty.").max(120),
  body: z.string().trim().min(10, "Say a sentence about what you sell.").max(400),
  primaryLabel: z.string().trim().min(2).max(40),
  primaryHref: z.string().trim().min(1).max(200),
  secondaryLabel: z.string().trim().min(2).max(40),
  secondaryHref: z.string().trim().min(1).max(200),
  image: z.string().trim().min(1, "Choose a photograph.").max(120),
});

export async function saveHeroAction(
  _previous: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const admin = await requireRole("ADMIN");

  const values: Record<string, string> = {};
  for (const field of heroSchema.keyof().options) {
    values[field] = String(formData.get(field) ?? "");
  }

  const parsed = heroSchema.safeParse(values);

  if (!parsed.success) {
    const errors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const field = issue.path[0];
      if (typeof field === "string" && !(field in errors)) errors[field] = issue.message;
    }
    return { status: "error", values, errors };
  }

  // A link that leaves the site would send somebody away from the shop, so the
  // buttons stay inside it.
  for (const href of [parsed.data.primaryHref, parsed.data.secondaryHref]) {
    if (!href.startsWith("/") || href.startsWith("//")) {
      return {
        status: "error",
        values,
        errors: { primaryHref: "Links have to point somewhere on this site, such as /products." },
      };
    }
  }

  // The points marked on the photograph belong to the hero record, and they are
  // saved by their own form, so they are read back and carried through here.
  const existing = await prisma.siteContent.findUnique({
    where: { key: "home.hero" },
    select: { value: true },
  });

  const hotspots =
    existing?.value && typeof existing.value === "object" && "hotspots" in existing.value
      ? (existing.value as { hotspots: unknown }).hotspots
      : [];

  await writeContent(
    "home.hero",
    { ...parsed.data, hotspots },
    admin,
    "Changed the words and photograph in the hero",
  );

  return { ...emptyAuthState, status: "sent", message: "The hero is live." };
}

const hotspotSchema = z.array(
  z.object({
    x: z.number().min(0).max(100),
    y: z.number().min(0).max(100),
    code: z.string().trim().min(1).max(40),
    label: z.string().trim().min(1).max(60),
  }),
);

/**
 * The points marked on the hero photograph.
 *
 * Placed by clicking the picture rather than by typing coordinates, so the
 * payload arrives as a small array of percentages. Each one names a product by
 * its code, and a code that matches nothing published is simply not drawn on
 * the site, so a mistake here is quiet rather than broken.
 */
export async function saveHotspotsAction(
  _previous: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const admin = await requireRole("ADMIN");

  let parsed;

  try {
    parsed = hotspotSchema.safeParse(JSON.parse(String(formData.get("hotspots") ?? "[]")));
  } catch {
    return {
      status: "error",
      values: {},
      errors: { form: "Those points could not be read. Try placing them again." },
    };
  }

  if (!parsed.success) {
    return {
      status: "error",
      values: {},
      errors: { form: "Every point needs a product and a label." },
    };
  }

  const existing = await prisma.siteContent.findUnique({
    where: { key: "home.hero" },
    select: { value: true },
  });

  const hero =
    existing?.value && typeof existing.value === "object" ? existing.value : {};

  const count = parsed.data.length;

  await writeContent(
    "home.hero",
    { ...hero, hotspots: parsed.data },
    admin,
    `Marked ${count} ${count === 1 ? "point" : "points"} on the hero photograph`,
  );

  return {
    ...emptyAuthState,
    status: "sent",
    message: `${count} ${count === 1 ? "point" : "points"} saved.`,
  };
}

const listSchema = z
  .string()
  .transform((value) => value.split(",").map((entry) => entry.trim()).filter(Boolean))
  .pipe(z.array(z.string().max(80)).max(24));

/**
 * Which products appear on the home page, and in what order.
 *
 * The flags on the products are brought in step with the list in the same
 * breath, so the product editor and this screen always agree about what is
 * featured.
 */
export async function saveShowcaseAction(
  _previous: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const admin = await requireRole("ADMIN");

  const parsed = z
    .object({
      featured: listSchema,
      popular: listSchema,
      categories: listSchema,
    })
    .safeParse({
      featured: formData.get("featured") ?? "",
      popular: formData.get("popular") ?? "",
      categories: formData.get("categories") ?? "",
    });

  if (!parsed.success) {
    return {
      status: "error",
      values: {},
      errors: { form: "That arrangement could not be saved." },
    };
  }

  const { featured, popular, categories } = parsed.data;

  await prisma.$transaction([
    prisma.product.updateMany({ data: { isFeatured: false }, where: { isFeatured: true } }),
    prisma.product.updateMany({ data: { isPopular: false }, where: { isPopular: true } }),
    prisma.product.updateMany({
      data: { isFeatured: true },
      where: { code: { in: featured }, deletedAt: null },
    }),
    prisma.product.updateMany({
      data: { isPopular: true },
      where: { code: { in: popular }, deletedAt: null },
    }),
    prisma.category.updateMany({ data: { isFeatured: false }, where: { isFeatured: true } }),
    prisma.category.updateMany({
      data: { isFeatured: true },
      where: { slug: { in: categories }, deletedAt: null },
    }),
  ]);

  await writeContent(
    "home.showcase",
    { featured, popular, categories },
    admin,
    `Arranged the home page: ${categories.length} categories, ${featured.length} featured, ${popular.length} popular`,
  );

  revalidatePath("/admin/products");

  return { ...emptyAuthState, status: "sent", message: "The home page is arranged." };
}

const inspirationSchema = z.object({
  eyebrow: z.string().trim().min(2).max(80),
  headline: z.string().trim().min(4).max(120),
  images: listSchema,
});

export async function saveInspirationAction(
  _previous: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const admin = await requireRole("ADMIN");

  const values = {
    eyebrow: String(formData.get("eyebrow") ?? ""),
    headline: String(formData.get("headline") ?? ""),
    images: String(formData.get("images") ?? ""),
  };

  const parsed = inspirationSchema.safeParse(values);

  if (!parsed.success) {
    return {
      status: "error",
      values,
      errors: { form: "Give the block a heading and at least one photograph." },
    };
  }

  await writeContent(
    "home.inspiration",
    parsed.data,
    admin,
    "Changed the photographs at the foot of the home page",
  );

  return { ...emptyAuthState, status: "sent", message: "Saved and live." };
}

/**
 * The numbered argument on the dark sheet.
 *
 * Rows arrive as a JSON array from a repeating form, which is the one shape
 * that survives adding and removing rows without the browser renumbering the
 * fields underneath somebody.
 */
export async function saveReasonsAction(
  _previous: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const admin = await requireRole("ADMIN");

  const schema = z.object({
    eyebrow: z.string().trim().min(2).max(80),
    headline: z.string().trim().min(4).max(120),
    items: z
      .array(
        z.object({
          title: z.string().trim().min(2).max(80),
          body: z.string().trim().min(10).max(400),
          note: z
            .string()
            .trim()
            .max(60)
            .optional()
            .transform((value) => (value && value.length > 0 ? value : undefined)),
        }),
      )
      .max(8),
  });

  let items: unknown = [];

  try {
    items = JSON.parse(String(formData.get("items") ?? "[]"));
  } catch {
    return {
      status: "error",
      values: {},
      errors: { form: "Those rows could not be read." },
    };
  }

  const parsed = schema.safeParse({
    eyebrow: String(formData.get("eyebrow") ?? ""),
    headline: String(formData.get("headline") ?? ""),
    items,
  });

  if (!parsed.success) {
    return {
      status: "error",
      values: {},
      errors: {
        form: "Every box needs a short title and a sentence or two underneath it.",
      },
    };
  }

  await writeContent(
    "home.reasons",
    parsed.data,
    admin,
    `Rewrote the reasons block, ${parsed.data.items.length} rows`,
  );

  return { ...emptyAuthState, status: "sent", message: "Saved and live." };
}
