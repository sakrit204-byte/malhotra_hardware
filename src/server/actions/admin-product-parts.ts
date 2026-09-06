"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireRole } from "@/server/auth/guards";
import { prisma } from "@/server/db/prisma";
import { optionalRelation } from "@/server/db/relations";
import { recordAudit } from "@/server/services/audit";

/**
 * Variants and specifications.
 *
 * These are the two places where a catalogue normally hardens into code. A new
 * finish becomes a migration, a new technical attribute becomes a column, and
 * the business is back on the phone to a developer. Here both are rows: a
 * variant is a row, a specification is a row pointing at a definition, and an
 * administrator adds either one from the product editor.
 */

const variantSchema = z.object({
  productId: z.string().min(1).max(60),
  id: z.string().max(60).optional(),
  name: z.string().trim().min(1, "Give the option a name.").max(120),
  code: z
    .string()
    .trim()
    .min(1)
    .max(60)
    .refine((value) => !value.includes("-"), "Codes cannot contain a hyphen."),
  size: z
    .string()
    .trim()
    .max(60)
    .optional()
    .transform((value) => (value && value.length > 0 ? value : null)),
  finishId: z
    .string()
    .max(60)
    .optional()
    .transform((value) => (value && value.length > 0 ? value : null)),
  availability: z.enum([
    "IN_STOCK",
    "LIMITED",
    "MADE_TO_ORDER",
    "OUT_OF_STOCK",
    "ON_REQUEST",
  ]),
});

export async function saveVariantAction(formData: FormData): Promise<void> {
  const admin = await requireRole("ADMIN");

  const parsed = variantSchema.safeParse({
    productId: formData.get("productId") ?? "",
    id: formData.get("id") ?? undefined,
    name: formData.get("name") ?? "",
    code: formData.get("code") ?? "",
    size: formData.get("size") ?? "",
    finishId: formData.get("finishId") ?? "",
    availability: formData.get("availability") ?? "ON_REQUEST",
  });

  if (!parsed.success) return;

  const data = parsed.data;

  const clash = await prisma.productVariant.findFirst({
    where: { code: data.code, ...(data.id ? { id: { not: data.id } } : {}) },
    select: { id: true },
  });

  if (clash) return;

  const shared = <M extends "create" | "update">(mode: M) => ({
    name: data.name,
    code: data.code,
    size: data.size,
    availability: data.availability,
    finish: optionalRelation(data.finishId, mode),
  });

  if (data.id) {
    await prisma.productVariant.update({
      where: { id: data.id },
      data: shared("update"),
    });
  } else {
    const count = await prisma.productVariant.count({
      where: { productId: data.productId },
    });

    await prisma.productVariant.create({
      data: {
        ...shared("create"),
        product: { connect: { id: data.productId } },
        sortOrder: count * 10,
      },
    });
  }

  await recordAudit({
    actor: admin,
    action: data.id ? "product.variantUpdated" : "product.variantAdded",
    entityType: "Product",
    entityId: data.productId,
    summary: `${data.id ? "Updated" : "Added"} option ${data.name}`,
  });

  revalidatePath(`/admin/products/${data.productId}`);
  revalidatePath("/products");
}

export async function deleteVariantAction(formData: FormData): Promise<void> {
  const admin = await requireRole("ADMIN");
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  const variant = await prisma.productVariant.findUnique({
    where: { id },
    select: { productId: true, name: true, _count: { select: { inquiryItems: true } } },
  });

  if (!variant) return;

  // An option somebody has already asked about is deactivated rather than
  // deleted, so their inquiry keeps pointing at something real.
  if (variant._count.inquiryItems > 0) {
    await prisma.productVariant.update({ where: { id }, data: { isActive: false } });
  } else {
    await prisma.productVariant.delete({ where: { id } });
  }

  await recordAudit({
    actor: admin,
    action: "product.variantRemoved",
    entityType: "Product",
    entityId: variant.productId,
    summary: `Removed option ${variant.name}`,
  });

  revalidatePath(`/admin/products/${variant.productId}`);
  revalidatePath("/products");
}

const specificationSchema = z.object({
  productId: z.string().min(1).max(60),
  definitionId: z.string().min(1).max(60),
  value: z.string().trim().min(1).max(300),
});

export async function saveSpecificationAction(formData: FormData): Promise<void> {
  const admin = await requireRole("ADMIN");

  const parsed = specificationSchema.safeParse({
    productId: formData.get("productId") ?? "",
    definitionId: formData.get("definitionId") ?? "",
    value: formData.get("value") ?? "",
  });

  if (!parsed.success) return;

  const { productId, definitionId, value } = parsed.data;

  // A new specification joins the end of the table rather than the top, so the
  // order an administrator built up is not disturbed by every addition.
  const existing = await prisma.productSpecification.count({ where: { productId } });

  await prisma.productSpecification.upsert({
    where: { productId_definitionId: { productId, definitionId } },
    create: {
      product: { connect: { id: productId } },
      definition: { connect: { id: definitionId } },
      value,
      sortOrder: existing * 10,
    },
    update: { value },
  });

  await recordAudit({
    actor: admin,
    action: "product.specificationSaved",
    entityType: "Product",
    entityId: productId,
    summary: "Saved a technical specification",
  });

  revalidatePath(`/admin/products/${productId}`);
  revalidatePath("/products");
}

export async function deleteSpecificationAction(formData: FormData): Promise<void> {
  await requireRole("ADMIN");
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  const specification = await prisma.productSpecification.findUnique({
    where: { id },
    select: { productId: true },
  });

  if (!specification) return;

  await prisma.productSpecification.delete({ where: { id } });

  revalidatePath(`/admin/products/${specification.productId}`);
  revalidatePath("/products");
}

/**
 * Adds a technical attribute to the whole catalogue.
 *
 * This is the one that keeps the schema from growing: a new attribute is a row
 * here, and every product can carry it from that moment on.
 */
export async function createDefinitionAction(formData: FormData): Promise<void> {
  const admin = await requireRole("ADMIN");

  const parsed = z
    .object({
      label: z.string().trim().min(2).max(80),
      unit: z
        .string()
        .trim()
        .max(20)
        .optional()
        .transform((value) => (value && value.length > 0 ? value : null)),
      groupName: z
        .string()
        .trim()
        .max(60)
        .optional()
        .transform((value) => (value && value.length > 0 ? value : null)),
      productId: z.string().max(60).optional(),
    })
    .safeParse({
      label: formData.get("label") ?? "",
      unit: formData.get("unit") ?? "",
      groupName: formData.get("groupName") ?? "",
      productId: formData.get("productId") ?? undefined,
    });

  if (!parsed.success) return;

  const key = parsed.data.label
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");

  const existing = await prisma.specificationDefinition.findUnique({ where: { key } });
  if (existing) return;

  const count = await prisma.specificationDefinition.count();

  await prisma.specificationDefinition.create({
    data: {
      key,
      label: parsed.data.label,
      unit: parsed.data.unit,
      groupName: parsed.data.groupName,
      sortOrder: (count + 1) * 10,
    },
  });

  await recordAudit({
    actor: admin,
    action: "specification.defined",
    entityType: "SpecificationDefinition",
    summary: `Added the attribute ${parsed.data.label}`,
  });

  if (parsed.data.productId) revalidatePath(`/admin/products/${parsed.data.productId}`);
  revalidatePath("/admin/products");
}
