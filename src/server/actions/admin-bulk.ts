"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { emptyAuthState, type AuthFormState } from "@/lib/auth-form";
import { requireRole } from "@/server/auth/guards";
import { prisma } from "@/server/db/prisma";
import { recordAudit } from "@/server/services/audit";

/**
 * Changing many products at once.
 *
 * This is the difference between an administrator who can run the catalogue and
 * one who asks a developer for a SQL statement. Publishing a whole category,
 * sale, withdrawing a discontinued range, or promoting eight pieces to the home
 * page are all one action here.
 *
 * Three things keep it safe. The set of products is always sent explicitly, so
 * nothing is inferred from a filter that might have changed since the page was
 * drawn. Removal stays soft, exactly as it is for a single product. And every
 * change is written to the audit record with the number of rows it touched, so
 * a bulk mistake can be seen and understood afterwards.
 */

const bulkSchema = z.object({
  ids: z
    .string()
    .transform((value) => value.split(",").map((id) => id.trim()).filter(Boolean))
    .pipe(z.array(z.string().max(60)).min(1).max(1000)),
  intent: z.enum([
    "publish",
    "withdraw",
    "feature",
    "unfeature",
    "popular",
    "unpopular",
    "category",
    "availability",
    "delete",
  ]),
  categoryId: z.string().max(60).optional(),
  availability: z
    .enum(["IN_STOCK", "LIMITED", "MADE_TO_ORDER", "OUT_OF_STOCK", "ON_REQUEST"])
    .optional(),
});

/** What each intent does, in the words shown back to the person who did it. */
const WORDING: Record<string, (count: number) => string> = {
  publish: (n) => `Published ${n} ${n === 1 ? "product" : "products"}`,
  withdraw: (n) => `Withdrew ${n} ${n === 1 ? "product" : "products"}`,
  feature: (n) => `Featured ${n} ${n === 1 ? "product" : "products"}`,
  unfeature: (n) => `Removed ${n} ${n === 1 ? "product" : "products"} from featured`,
  popular: (n) => `Marked ${n} ${n === 1 ? "product" : "products"} popular`,
  unpopular: (n) => `Removed ${n} ${n === 1 ? "product" : "products"} from popular`,
  category: (n) => `Moved ${n} ${n === 1 ? "product" : "products"} to another category`,
  availability: (n) => `Changed availability on ${n} ${n === 1 ? "product" : "products"}`,
  delete: (n) => `Removed ${n} ${n === 1 ? "product" : "products"} from the catalogue`,
};

export async function bulkProductAction(
  _previous: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const admin = await requireRole("ADMIN");

  const parsed = bulkSchema.safeParse({
    ids: formData.get("ids") ?? "",
    intent: formData.get("intent") ?? "",
    categoryId: formData.get("categoryId") ?? "",
    availability: formData.get("availability") || undefined,
  });

  if (!parsed.success) {
    return {
      status: "error",
      values: {},
      errors: { form: "Choose at least one product and what to do with it." },
    };
  }

  const { ids, intent } = parsed.data;
  const where = { id: { in: ids }, deletedAt: null };

  try {
    let touched = 0;

    if (intent === "publish" || intent === "withdraw") {
      const publishing = intent === "publish";

      // Publishing a product with no photograph would put a blank card in the
      // catalogue, so those are held back and reported rather than published.
      const eligible = publishing
        ? (
            await prisma.product.findMany({
              where: { ...where, images: { some: {} } },
              select: { id: true },
            })
          ).map((row) => row.id)
        : ids;

      const result = await prisma.product.updateMany({
        where: { id: { in: eligible }, deletedAt: null },
        data: { isPublished: publishing, publishedAt: publishing ? new Date() : null },
      });

      touched = result.count;

      if (publishing && eligible.length < ids.length) {
        const held = ids.length - eligible.length;

        await recordAudit({
          actor: admin,
          action: "product.bulkPublished",
          entityType: "Product",
          summary: WORDING.publish(touched),
        });

        revalidatePath("/admin/products");
        revalidatePath("/products");
        revalidatePath("/");

        return {
          ...emptyAuthState,
          status: "sent",
          message: `${WORDING.publish(touched)}. ${held} ${
            held === 1 ? "was" : "were"
          } left alone because there is no photograph yet.`,
        };
      }
    } else if (intent === "feature" || intent === "unfeature") {
      const result = await prisma.product.updateMany({
        where,
        data: { isFeatured: intent === "feature" },
      });
      touched = result.count;
    } else if (intent === "popular" || intent === "unpopular") {
      const result = await prisma.product.updateMany({
        where,
        data: { isPopular: intent === "popular" },
      });
      touched = result.count;
    } else if (intent === "category") {
      if (!parsed.data.categoryId) {
        return {
          status: "error",
          values: {},
          errors: { form: "Choose the category to move them into." },
        };
      }

      const result = await prisma.product.updateMany({
        where,
        // The subcategory belonged to the old parent, so it is cleared rather
        // than left pointing at a branch these products no longer sit under.
        data: { categoryId: parsed.data.categoryId, subcategoryId: null },
      });
      touched = result.count;
    } else if (intent === "availability") {
      if (!parsed.data.availability) {
        return {
          status: "error",
          values: {},
          errors: { form: "Choose the availability to set." },
        };
      }

      const result = await prisma.product.updateMany({
        where,
        data: { availability: parsed.data.availability },
      });
      touched = result.count;
    } else if (intent === "delete") {
      const result = await prisma.product.updateMany({
        where,
        data: {
          deletedAt: new Date(),
          isPublished: false,
          isFeatured: false,
          isPopular: false,
        },
      });
      touched = result.count;
    }

    await recordAudit({
      actor: admin,
      action: `product.bulk.${intent}`,
      entityType: "Product",
      summary: WORDING[intent](touched),
      after: { ids: ids.length, touched },
    });

    revalidatePath("/admin/products");
    revalidatePath("/products");
    revalidatePath("/");

    return {
      ...emptyAuthState,
      status: "sent",
      message: `${WORDING[intent](touched)}.`,
    };
  } catch (error) {
    console.error("A bulk change failed", error);
    return {
      status: "error",
      values: {},
      errors: { form: "That change could not be applied. Nothing has been altered." },
    };
  }
}
