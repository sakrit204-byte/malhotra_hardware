"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import sharp from "sharp";
import { z } from "zod";

import { emptyAuthState, type AuthFormState } from "@/lib/auth-form";
import { requireRole } from "@/server/auth/guards";
import { prisma } from "@/server/db/prisma";
import { optionalRelation } from "@/server/db/relations";
import { recordAudit } from "@/server/services/audit";
import { deletePublicFile, savePublicFile } from "@/server/storage";

/**
 * Product management.
 *
 * The point of this platform is that nobody has to ring a developer to add a
 * product, change a price, swap a photograph or take something off the site.
 * So everything a product record holds is editable here, and a change takes
 * effect on the public catalogue immediately: the card, the detail page, the
 * filters and the sitemap all come from these same rows.
 *
 * Deleting is soft. A product that has been asked about appears on inquiries
 * that are part of a customer's history, and destroying the row would tear a
 * hole in paperwork that has already been sent.
 */

const optional = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .transform((value) => (value && value.length > 0 ? value : null));

const productSchema = z.object({
  id: z.string().max(60).optional(),
  name: z.string().trim().min(2, "Give the product a name.").max(160),
  code: z
    .string()
    .trim()
    .min(2, "Give the product a code.")
    .max(40)
    .refine(
      (value) => !value.includes("-"),
      "Product codes are shown to customers, so they cannot contain a hyphen. Use spaces.",
    ),
  categoryId: z.string().min(1, "Choose a category."),
  subcategoryId: optional(60),
  brandId: optional(60),
  materialId: optional(60),
  finishId: optional(60),
  applicationId: optional(60),
  shortDescription: optional(400),
  description: optional(4000),
  dimensions: optional(160),
  availability: z.enum([
    "IN_STOCK",
    "LIMITED",
    "MADE_TO_ORDER",
    "OUT_OF_STOCK",
    "ON_REQUEST",
  ]),
  isPublished: z.union([z.string(), z.boolean()]).optional().transform(Boolean),
  isFeatured: z.union([z.string(), z.boolean()]).optional().transform(Boolean),
  isPopular: z.union([z.string(), z.boolean()]).optional().transform(Boolean),
  metaTitle: optional(160),
  metaDescription: optional(300),
});

function slugify(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/** Keeps a slug unique without asking the editor to think about slugs. */
async function uniqueSlug(name: string, exceptId?: string): Promise<string> {
  const base = slugify(name) || "product";

  for (let attempt = 0; attempt < 50; attempt += 1) {
    const candidate = attempt === 0 ? base : `${base}-${attempt + 1}`;

    const clash = await prisma.product.findFirst({
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

/** Every field the editor posts, in the order the form asks for them. */
const PRODUCT_FIELDS = [
  "name",
  "code",
  "categoryId",
  "subcategoryId",
  "brandId",
  "materialId",
  "finishId",
  "applicationId",
  "shortDescription",
  "description",
  "dimensions",
  "availability",
  "metaTitle",
  "metaDescription",
  "isPublished",
  "isFeatured",
  "isPopular",
] as const;

/**
 * What was typed, given back verbatim.
 *
 * React empties a form once its action has run, so a rejected save would
 * otherwise wipe a long description because a product code was wrong. Handing
 * the values back lets the form redraw itself exactly as it was left.
 */
function submitted(formData: FormData): Record<string, string> {
  const values: Record<string, string> = {};

  for (const field of PRODUCT_FIELDS) {
    values[field] = String(formData.get(field) ?? "");
  }

  return values;
}

export async function saveProductAction(
  _previous: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const admin = await requireRole("ADMIN");

  const parsed = productSchema.safeParse({
    id: formData.get("id") ?? undefined,
    name: formData.get("name") ?? "",
    code: formData.get("code") ?? "",
    categoryId: formData.get("categoryId") ?? "",
    subcategoryId: formData.get("subcategoryId") ?? "",
    brandId: formData.get("brandId") ?? "",
    materialId: formData.get("materialId") ?? "",
    finishId: formData.get("finishId") ?? "",
    applicationId: formData.get("applicationId") ?? "",
    shortDescription: formData.get("shortDescription") ?? "",
    description: formData.get("description") ?? "",
    dimensions: formData.get("dimensions") ?? "",
    availability: formData.get("availability") ?? "ON_REQUEST",
    isPublished: formData.get("isPublished") ?? false,
    isFeatured: formData.get("isFeatured") ?? false,
    isPopular: formData.get("isPopular") ?? false,
    metaTitle: formData.get("metaTitle") ?? "",
    metaDescription: formData.get("metaDescription") ?? "",
  });

  if (!parsed.success) {
    const errors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const field = issue.path[0];
      if (typeof field === "string" && !(field in errors))
        errors[field] = issue.message;
    }

    return { status: "error", values: submitted(formData), errors };
  }

  const data = parsed.data;

  // A code is what a customer quotes on the phone, so it has to be unique.
  const clash = await prisma.product.findFirst({
    where: { code: data.code, ...(data.id ? { id: { not: data.id } } : {}) },
    select: { id: true },
  });

  if (clash) {
    return {
      status: "error",
      errors: { code: "Another product already uses that code." },
      values: submitted(formData),
    };
  }

  const shared = <M extends "create" | "update">(mode: M) => ({
    name: data.name,
    code: data.code,
    category: { connect: { id: data.categoryId } },
    subcategory: optionalRelation(data.subcategoryId, mode),
    brand: optionalRelation(data.brandId, mode),
    material: optionalRelation(data.materialId, mode),
    finish: optionalRelation(data.finishId, mode),
    application: optionalRelation(data.applicationId, mode),
    shortDescription: data.shortDescription,
    description: data.description,
    dimensions: data.dimensions,
    availability: data.availability,
    isPublished: data.isPublished,
    isFeatured: data.isFeatured,
    isPopular: data.isPopular,
    metaTitle: data.metaTitle,
    metaDescription: data.metaDescription,
    publishedAt: data.isPublished ? new Date() : null,
  });

  try {
    if (data.id) {
      const before = await prisma.product.findUnique({
        where: { id: data.id },
        select: { name: true, code: true, isPublished: true },
      });

      await prisma.product.update({
        where: { id: data.id },
        data: {
          ...shared("update"),
          slug: await uniqueSlug(data.name, data.id),
          publishedAt: data.isPublished
            ? before?.isPublished
              ? undefined
              : new Date()
            : null,
        },
      });

      await recordAudit({
        actor: admin,
        action: "product.updated",
        entityType: "Product",
        entityId: data.id,
        summary: `Updated ${data.name}`,
        before,
        after: {
          name: data.name,
          code: data.code,
          isPublished: data.isPublished,
        },
      });

      revalidatePath("/admin/products");
      revalidatePath(`/admin/products/${data.id}`);
      revalidatePath("/products");
      revalidatePath("/");

      return { ...emptyAuthState, status: "sent", message: "Saved." };
    }

    const created = await prisma.product.create({
      data: { ...shared("create"), slug: await uniqueSlug(data.name) },
      select: { id: true },
    });

    await recordAudit({
      actor: admin,
      action: "product.created",
      entityType: "Product",
      entityId: created.id,
      summary: `Created ${data.name}`,
      after: { name: data.name, code: data.code },
    });

    revalidatePath("/admin/products");
    revalidatePath("/products");

    redirect(`/admin/products/${created.id}`);
  } catch (error) {
    // redirect throws by design, so it must not be caught as a failure.
    if (error && typeof error === "object" && "digest" in error) throw error;

    console.error("Could not save the product", error);
    return {
      status: "error",
      errors: { form: "The product could not be saved. Please try again." },
      values: submitted(formData),
    };
  }
}

/** Publishes or withdraws a product without opening the editor. */
export async function toggleProductPublishedAction(
  formData: FormData,
): Promise<void> {
  const admin = await requireRole("ADMIN");
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  const product = await prisma.product.findUnique({
    where: { id },
    select: { name: true, isPublished: true },
  });

  if (!product) return;

  await prisma.product.update({
    where: { id },
    data: {
      isPublished: !product.isPublished,
      publishedAt: product.isPublished ? null : new Date(),
    },
  });

  await recordAudit({
    actor: admin,
    action: product.isPublished ? "product.unpublished" : "product.published",
    entityType: "Product",
    entityId: id,
    summary: `${product.isPublished ? "Withdrew" : "Published"} ${product.name}`,
  });

  revalidatePath("/admin/products");
  revalidatePath("/products");
  revalidatePath("/");
}

/**
 * Removes a product from the catalogue.
 *
 * Soft, always. Inquiries already sent refer to this row, and a hard delete
 * would leave a customer's own history pointing at nothing.
 */
export async function deleteProductAction(formData: FormData): Promise<void> {
  const admin = await requireRole("ADMIN");
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  const product = await prisma.product.findUnique({
    where: { id },
    select: { name: true },
  });

  if (!product) return;

  await prisma.product.update({
    where: { id },
    data: {
      deletedAt: new Date(),
      isPublished: false,
      isFeatured: false,
      isPopular: false,
    },
  });

  await recordAudit({
    actor: admin,
    action: "product.deleted",
    entityType: "Product",
    entityId: id,
    summary: `Removed ${product.name} from the catalogue`,
  });

  revalidatePath("/admin/products");
  revalidatePath("/products");
  redirect("/admin/products");
}

/** Copies a product as an unpublished draft, ready to be edited. */
export async function duplicateProductAction(
  formData: FormData,
): Promise<void> {
  const admin = await requireRole("ADMIN");
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  const source = await prisma.product.findUnique({
    where: { id },
    include: {
      images: true,
      variants: true,
      specifications: true,
      tags: { select: { id: true } },
    },
  });

  if (!source) return;

  const name = `${source.name} copy`;

  const created = await prisma.product.create({
    data: {
      name,
      slug: await uniqueSlug(name),
      code: `${source.code} C${Date.now().toString().slice(-4)}`,
      categoryId: source.categoryId,
      subcategoryId: source.subcategoryId,
      brandId: source.brandId,
      materialId: source.materialId,
      finishId: source.finishId,
      applicationId: source.applicationId,
      shortDescription: source.shortDescription,
      description: source.description,
      dimensions: source.dimensions,
      availability: source.availability,
      // A copy always starts as a draft, so an unfinished duplicate can never
      // appear in the catalogue by accident.
      isPublished: false,
      tags: { connect: source.tags.map((tag) => ({ id: tag.id })) },
      images: {
        create: source.images.map((image) => ({
          url: image.url,
          alt: image.alt,
          credit: image.credit,
          sourceUrl: image.sourceUrl,
          isPrimary: image.isPrimary,
          sortOrder: image.sortOrder,
        })),
      },
      variants: {
        create: source.variants.map((variant, index) => ({
          name: variant.name,
          code: `${variant.code} C${index + 1}`,
          size: variant.size,
          materialId: variant.materialId,
          finishId: variant.finishId,
          availability: variant.availability,
          sortOrder: variant.sortOrder,
        })),
      },
      specifications: {
        create: source.specifications.map((specification) => ({
          definitionId: specification.definitionId,
          value: specification.value,
          sortOrder: specification.sortOrder,
        })),
      },
    },
    select: { id: true },
  });

  await recordAudit({
    actor: admin,
    action: "product.duplicated",
    entityType: "Product",
    entityId: created.id,
    summary: `Duplicated ${source.name}`,
  });

  revalidatePath("/admin/products");
  redirect(`/admin/products/${created.id}`);
}

// ---------------------------------------------------------------- images

const IMAGE_TYPES: Record<string, (bytes: Uint8Array) => boolean> = {
  "image/jpeg": (bytes) =>
    bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff,
  "image/png": (bytes) =>
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47,
  "image/webp": (bytes) =>
    bytes[0] === 0x52 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46 &&
    bytes[3] === 0x46 &&
    bytes[8] === 0x57,
};

const MAX_IMAGE_BYTES = 12 * 1024 * 1024;

/**
 * Adds photographs to a product.
 *
 * Each file is checked against its actual bytes, not its name or its declared
 * type, then re encoded to a sensible size. Re encoding also strips whatever
 * metadata the camera left behind, which on a photograph taken on a phone can
 * include where it was taken.
 */
export async function uploadProductImagesAction(
  _previous: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const admin = await requireRole("ADMIN");
  const productId = String(formData.get("productId") ?? "");

  const product = await prisma.product.findFirst({
    where: { id: productId, deletedAt: null },
    select: { id: true, name: true, _count: { select: { images: true } } },
  });

  if (!product) {
    return {
      status: "error",
      values: {},
      errors: { form: "That product no longer exists." },
    };
  }

  const files = formData
    .getAll("images")
    .filter((entry): entry is File => entry instanceof File && entry.size > 0);

  if (files.length === 0) {
    return {
      status: "error",
      values: {},
      errors: { form: "Choose at least one image." },
    };
  }

  const errors: string[] = [];
  let added = 0;

  for (const [index, file] of files.entries()) {
    if (file.size > MAX_IMAGE_BYTES) {
      errors.push(`${file.name} is larger than 12 MB.`);
      continue;
    }

    const original = Buffer.from(await file.arrayBuffer());
    const head = new Uint8Array(original.subarray(0, 16));
    const matched = Object.entries(IMAGE_TYPES).find(([, test]) => test(head));

    if (!matched) {
      errors.push(`${file.name} is not a JPEG, PNG or WebP image.`);
      continue;
    }

    try {
      const processed = await sharp(original)
        .rotate()
        .resize({
          width: 1600,
          height: 1600,
          fit: "inside",
          withoutEnlargement: true,
        })
        .jpeg({ quality: 82, progressive: true })
        .toBuffer({ resolveWithObject: true });

      const stored = await savePublicFile({
        folder: "products",
        fileName: `${product.id}.jpg`,
        mimeType: "image/jpeg",
        content: processed.data,
      });

      await prisma.productImage.create({
        data: {
          product: { connect: { id: product.id } },
          url: stored.url,
          alt: product.name,
          width: processed.info.width,
          height: processed.info.height,
          isPrimary: product._count.images === 0 && index === 0,
          sortOrder: (product._count.images + index) * 10,
        },
      });

      added += 1;
    } catch (error) {
      console.error(`Could not process ${file.name}`, error);
      errors.push(`${file.name} could not be processed.`);
    }
  }

  if (added > 0) {
    await recordAudit({
      actor: admin,
      action: "product.imagesAdded",
      entityType: "Product",
      entityId: product.id,
      summary: `Added ${added} ${added === 1 ? "image" : "images"} to ${product.name}`,
    });

    revalidatePath(`/admin/products/${product.id}`);
    revalidatePath("/products");
    revalidatePath("/");
  }

  if (errors.length > 0) {
    return { status: "error", values: {}, errors: { form: errors.join(" ") } };
  }

  return {
    ...emptyAuthState,
    status: "sent",
    message: `${added} ${added === 1 ? "image" : "images"} added.`,
  };
}

export async function updateImageAction(formData: FormData): Promise<void> {
  const admin = await requireRole("ADMIN");
  const id = String(formData.get("imageId") ?? "");
  const intent = String(formData.get("intent") ?? "");
  if (!id) return;

  const image = await prisma.productImage.findUnique({
    where: { id },
    select: {
      id: true,
      productId: true,
      sortOrder: true,
      alt: true,
      url: true,
      isPrimary: true,
    },
  });

  if (!image) return;

  if (intent === "primary") {
    // Exactly one primary. Clearing the others first keeps that true even if a
    // previous edit left two behind.
    await prisma.$transaction([
      prisma.productImage.updateMany({
        where: { productId: image.productId },
        data: { isPrimary: false },
      }),
      prisma.productImage.update({ where: { id }, data: { isPrimary: true } }),
    ]);
  } else if (intent === "up" || intent === "down") {
    await prisma.productImage.update({
      where: { id },
      data: { sortOrder: image.sortOrder + (intent === "up" ? -15 : 15) },
    });

    // Renumber so repeated moves stay stable.
    const ordered = await prisma.productImage.findMany({
      where: { productId: image.productId },
      orderBy: { sortOrder: "asc" },
      select: { id: true },
    });

    await prisma.$transaction(
      ordered.map((row, index) =>
        prisma.productImage.update({
          where: { id: row.id },
          data: { sortOrder: index * 10 },
        }),
      ),
    );
  } else if (intent === "alt") {
    const alt = String(formData.get("alt") ?? "")
      .trim()
      .slice(0, 300);
    if (alt) await prisma.productImage.update({ where: { id }, data: { alt } });
  } else if (intent === "delete") {
    await prisma.productImage.delete({ where: { id } });

    // The photograph that led is gone, so something else has to. Without this
    // the product would show whichever image happened to sort first while the
    // catalogue believed it had no leading photograph at all.
    if (image.isPrimary) {
      const next = await prisma.productImage.findFirst({
        where: { productId: image.productId },
        orderBy: { sortOrder: "asc" },
        select: { id: true },
      });

      if (next) {
        await prisma.productImage.update({
          where: { id: next.id },
          data: { isPrimary: true },
        });
      }
    }

    // The file goes too, but only once nothing else points at it. Seeded
    // photography is shared between products, and removing it from one would
    // otherwise leave holes in the others.
    const stillUsed = await prisma.productImage.count({ where: { url: image.url } });
    if (stillUsed === 0) await deletePublicFile(image.url);

    await recordAudit({
      actor: admin,
      action: "product.imageRemoved",
      entityType: "Product",
      entityId: image.productId,
      summary: "Removed a product image",
    });
  }

  revalidatePath(`/admin/products/${image.productId}`);
  revalidatePath("/products");
  revalidatePath("/");
}
