"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { emptyAuthState, type AuthFormState } from "@/lib/auth-form";
import { requireRole } from "@/server/auth/guards";
import { prisma } from "@/server/db/prisma";
import { recordAudit } from "@/server/services/audit";

/**
 * Categories and the other filter values.
 *
 * The public catalogue reads every category, brand, material, finish and
 * application straight out of these tables, in the order set here. Adding one
 * changes the navigation, the filters and the home page immediately. Nothing in
 * the frontend has a list of them.
 */

function slugify(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

async function uniqueCategorySlug(
  name: string,
  exceptId?: string,
): Promise<string> {
  const base = slugify(name) || "category";

  for (let attempt = 0; attempt < 50; attempt += 1) {
    const candidate = attempt === 0 ? base : `${base}-${attempt + 1}`;

    const clash = await prisma.category.findFirst({
      where: {
        slug: candidate,
        ...(exceptId ? { id: { not: exceptId } } : {}),
      },
      select: { id: true },
    });

    if (!clash) return candidate;
  }

  return `${base}-${Date.now()}`;
}

const categorySchema = z.object({
  id: z.string().max(60).optional(),
  name: z.string().trim().min(2, "Give the category a name.").max(120),
  description: z
    .string()
    .trim()
    .max(600)
    .optional()
    .transform((value) => (value && value.length > 0 ? value : null)),
  parentId: z
    .string()
    .max(60)
    .optional()
    .transform((value) => (value && value.length > 0 ? value : null)),
  isFeatured: z.union([z.string(), z.boolean()]).optional().transform(Boolean),
  isHidden: z.union([z.string(), z.boolean()]).optional().transform(Boolean),
});

/**
 * What was typed, given back verbatim.
 *
 * React empties a form once its action has run, so without this a rejected
 * submission would clear the fields the person had just filled in.
 */
function submittedCategory(formData: FormData): Record<string, string> {
  const values: Record<string, string> = {};

  for (const field of [
    "name",
    "description",
    "parentId",
    "isFeatured",
    "isHidden",
  ]) {
    values[field] = String(formData.get(field) ?? "");
  }

  return values;
}

export async function saveCategoryAction(
  _previous: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const admin = await requireRole("ADMIN");

  const parsed = categorySchema.safeParse({
    id: formData.get("id") ?? undefined,
    name: formData.get("name") ?? "",
    description: formData.get("description") ?? "",
    parentId: formData.get("parentId") ?? "",
    isFeatured: formData.get("isFeatured") ?? false,
    isHidden: formData.get("isHidden") ?? false,
  });

  if (!parsed.success) {
    const errors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const field = issue.path[0];
      if (typeof field === "string" && !(field in errors))
        errors[field] = issue.message;
    }
    return { status: "error", values: submittedCategory(formData), errors };
  }

  const data = parsed.data;

  // A category cannot be its own parent, and the tree stays two deep, because
  // the catalogue navigation is built for exactly that shape.
  if (data.id && data.parentId === data.id) {
    return {
      status: "error",
      values: submittedCategory(formData),
      errors: { parentId: "A category cannot sit inside itself." },
    };
  }

  if (data.parentId) {
    const parent = await prisma.category.findUnique({
      where: { id: data.parentId },
      select: { parentId: true },
    });

    if (parent?.parentId) {
      return {
        status: "error",
        values: submittedCategory(formData),
        errors: {
          parentId: "Categories go two levels deep. Choose a top level parent.",
        },
      };
    }
  }

  try {
    if (data.id) {
      await prisma.category.update({
        where: { id: data.id },
        data: {
          name: data.name,
          slug: await uniqueCategorySlug(data.name, data.id),
          description: data.description,
          parentId: data.parentId,
          isFeatured: data.isFeatured,
          isHidden: data.isHidden,
        },
      });

      await recordAudit({
        actor: admin,
        action: "category.updated",
        entityType: "Category",
        entityId: data.id,
        summary: `Updated the category ${data.name}`,
      });
    } else {
      const siblings = await prisma.category.count({
        where: { parentId: data.parentId },
      });

      const created = await prisma.category.create({
        data: {
          name: data.name,
          slug: await uniqueCategorySlug(data.name),
          description: data.description,
          parentId: data.parentId,
          isFeatured: data.isFeatured,
          isHidden: data.isHidden,
          sortOrder: (siblings + 1) * 10,
        },
        select: { id: true },
      });

      await recordAudit({
        actor: admin,
        action: "category.created",
        entityType: "Category",
        entityId: created.id,
        summary: `Created the category ${data.name}`,
      });
    }

    revalidatePath("/admin/categories");
    revalidatePath("/products");
    revalidatePath("/");

    return { ...emptyAuthState, status: "sent", message: "Saved." };
  } catch (error) {
    console.error("Could not save the category", error);
    return {
      status: "error",
      values: submittedCategory(formData),
      errors: { form: "The category could not be saved. Please try again." },
    };
  }
}

export async function moveCategoryAction(formData: FormData): Promise<void> {
  await requireRole("ADMIN");

  const id = String(formData.get("id") ?? "");
  const direction = String(formData.get("direction") ?? "");
  if (!id) return;

  const category = await prisma.category.findUnique({
    where: { id },
    select: { id: true, parentId: true, sortOrder: true },
  });

  if (!category) return;

  await prisma.category.update({
    where: { id },
    data: { sortOrder: category.sortOrder + (direction === "up" ? -15 : 15) },
  });

  // Renumber the whole level so repeated moves stay predictable.
  const siblings = await prisma.category.findMany({
    where: { parentId: category.parentId, deletedAt: null },
    orderBy: { sortOrder: "asc" },
    select: { id: true },
  });

  await prisma.$transaction(
    siblings.map((sibling, index) =>
      prisma.category.update({
        where: { id: sibling.id },
        data: { sortOrder: index * 10 },
      }),
    ),
  );

  revalidatePath("/admin/categories");
  revalidatePath("/products");
  revalidatePath("/");
}

export async function toggleCategoryHiddenAction(
  formData: FormData,
): Promise<void> {
  const admin = await requireRole("ADMIN");
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  const category = await prisma.category.findUnique({
    where: { id },
    select: { name: true, isHidden: true },
  });

  if (!category) return;

  await prisma.category.update({
    where: { id },
    data: { isHidden: !category.isHidden },
  });

  await recordAudit({
    actor: admin,
    action: category.isHidden ? "category.shown" : "category.hidden",
    entityType: "Category",
    entityId: id,
    summary: `${category.isHidden ? "Showed" : "Hid"} the category ${category.name}`,
  });

  revalidatePath("/admin/categories");
  revalidatePath("/products");
  revalidatePath("/");
}

/**
 * Removes a category.
 *
 * Refused while anything still points at it. A category holding products or
 * subcategories cannot simply vanish, because the products would be left
 * without a home and the catalogue would break rather than degrade.
 */
export async function deleteCategoryAction(formData: FormData): Promise<void> {
  const admin = await requireRole("ADMIN");
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  const category = await prisma.category.findUnique({
    where: { id },
    select: {
      name: true,
      _count: {
        select: {
          productsAsCategory: true,
          productsAsSubcategory: true,
          children: true,
        },
      },
    },
  });

  if (!category) return;

  const inUse =
    category._count.productsAsCategory +
    category._count.productsAsSubcategory +
    category._count.children;

  if (inUse > 0) return;

  await prisma.category.update({
    where: { id },
    data: { deletedAt: new Date(), isHidden: true },
  });

  await recordAudit({
    actor: admin,
    action: "category.deleted",
    entityType: "Category",
    entityId: id,
    summary: `Removed the category ${category.name}`,
  });

  revalidatePath("/admin/categories");
  revalidatePath("/products");
  revalidatePath("/");
}

/** Adds a filter value: a brand, a material, a finish or an application. */
export async function createTaxonomyValueAction(
  formData: FormData,
): Promise<void> {
  const admin = await requireRole("ADMIN");

  const parsed = z
    .object({
      kind: z.enum(["brand", "material", "finish", "application"]),
      name: z.string().trim().min(2).max(120),
      swatchHex: z
        .string()
        .trim()
        .regex(/^#[0-9a-fA-F]{6}$/)
        .optional()
        .or(z.literal("").transform(() => undefined)),
    })
    .safeParse({
      kind: formData.get("kind") ?? "",
      name: formData.get("name") ?? "",
      swatchHex: formData.get("swatchHex") ?? "",
    });

  if (!parsed.success) return;

  const { kind, name, swatchHex } = parsed.data;
  const slug = slugify(name);

  try {
    if (kind === "brand") {
      await prisma.brand.create({ data: { name, slug } });
    } else if (kind === "material") {
      await prisma.material.create({ data: { name, slug } });
    } else if (kind === "finish") {
      await prisma.finish.create({
        data: { name, slug, swatchHex: swatchHex ?? null },
      });
    } else {
      await prisma.application.create({ data: { name, slug } });
    }

    await recordAudit({
      actor: admin,
      action: "taxonomy.created",
      entityType: kind,
      summary: `Added the ${kind} ${name}`,
    });

    revalidatePath("/admin/categories");
    revalidatePath("/products");
  } catch (error) {
    // A duplicate slug is the usual cause and is not worth an error page.
    console.error(`Could not add the ${kind}`, error);
  }
}
