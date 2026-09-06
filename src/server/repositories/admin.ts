import "server-only";

import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/server/db/prisma";

/**
 * Data for the administrator platform.
 *
 * Soft deleted rows stay out of every list here as well as out of the
 * catalogue, so an administrator sees the same world a customer does plus the
 * unpublished drafts, and never a row somebody has already removed.
 */

const ADMIN_PAGE_SIZE = 30;

/** What can be wrong with a product, as something you can filter a list by. */
export type ProductHealth =
  | "unphotographed"
  | "outOfStock"
  | "featured"
  | "popular";

const HEALTH_FILTERS: Record<ProductHealth, Prisma.ProductWhereInput> = {
  unphotographed: { isPublished: true, images: { none: {} } },
  outOfStock: { isPublished: true, availability: "OUT_OF_STOCK" },
  featured: { isFeatured: true },
  popular: { isPopular: true },
};

export type ProductSort = "recent" | "name" | "code" | "demand";

const PRODUCT_ORDER: Record<ProductSort, Prisma.ProductOrderByWithRelationInput[]> = {
  recent: [{ updatedAt: "desc" }],
  name: [{ name: "asc" }],
  code: [{ code: "asc" }],
  demand: [{ inquiryItems: { _count: "desc" } }, { updatedAt: "desc" }],
};

export async function listProductsForAdmin(input: {
  q?: string;
  category?: string;
  published?: "published" | "draft";
  health?: ProductHealth;
  sort?: ProductSort;
  page: number;
  /** Everything matching, ignoring the page. Used by select all. */
  idsOnly?: boolean;
}) {
  const and: Prisma.ProductWhereInput[] = [{ deletedAt: null }];

  if (input.q) {
    and.push({
      OR: [
        { name: { contains: input.q, mode: "insensitive" } },
        { code: { contains: input.q, mode: "insensitive" } },
      ],
    });
  }

  if (input.category) and.push({ categoryId: input.category });
  if (input.published === "published") and.push({ isPublished: true });
  if (input.published === "draft") and.push({ isPublished: false });
  if (input.health) and.push(HEALTH_FILTERS[input.health]);

  const where: Prisma.ProductWhereInput = { AND: and };

  const total = await prisma.product.count({ where });
  const pageCount = Math.max(1, Math.ceil(total / ADMIN_PAGE_SIZE));
  const page = Math.min(input.page, pageCount);

  const items = await prisma.product.findMany({
    where,
    orderBy: PRODUCT_ORDER[input.sort ?? "recent"],
    skip: (page - 1) * ADMIN_PAGE_SIZE,
    take: ADMIN_PAGE_SIZE,
    select: {
      id: true,
      name: true,
      slug: true,
      code: true,
      isPublished: true,
      isFeatured: true,
      isPopular: true,
      availability: true,
      updatedAt: true,
      category: { select: { name: true } },
      finish: { select: { name: true } },
      images: {
        take: 1,
        orderBy: [{ isPrimary: "desc" }, { sortOrder: "asc" }],
        select: { url: true, alt: true },
      },
      _count: { select: { variants: true, inquiryItems: true } },
    },
  });

  // Select all has to mean every product the filters match, not just the ones
  // drawn on this page, or a bulk change would quietly do a thirtieth of the
  // work somebody asked for.
  const matchingIds = input.idsOnly
    ? (await prisma.product.findMany({ where, select: { id: true } })).map((row) => row.id)
    : undefined;

  return { items, total, page, pageCount, matchingIds };
}

export type AdminProductRow = Awaited<
  ReturnType<typeof listProductsForAdmin>
>["items"][number];

/** One product with everything an editor needs to change. */
export async function getProductForAdmin(id: string) {
  return prisma.product.findFirst({
    where: { id, deletedAt: null },
    select: {
      id: true,
      name: true,
      slug: true,
      code: true,
      categoryId: true,
      subcategoryId: true,
      brandId: true,
      materialId: true,
      finishId: true,
      applicationId: true,
      shortDescription: true,
      description: true,
      dimensions: true,
      availability: true,
      isPublished: true,
      isFeatured: true,
      isPopular: true,
      sortOrder: true,
      metaTitle: true,
      metaDescription: true,
      images: {
        orderBy: [{ isPrimary: "desc" }, { sortOrder: "asc" }],
        select: { id: true, url: true, alt: true, isPrimary: true, sortOrder: true, credit: true },
      },
      variants: {
        orderBy: { sortOrder: "asc" },
        select: {
          id: true,
          name: true,
          code: true,
          size: true,
          finishId: true,
          availability: true,
          isActive: true,
          sortOrder: true,
        },
      },
      specifications: {
        orderBy: { sortOrder: "asc" },
        select: {
          id: true,
          value: true,
          definitionId: true,
          definition: { select: { key: true, label: true, unit: true } },
        },
      },
      tags: { select: { id: true, name: true } },
    },
  });
}

export type AdminProduct = NonNullable<Awaited<ReturnType<typeof getProductForAdmin>>>;

/** Everything an editor picks from, in administrator defined order. */
export async function getEditorOptions() {
  const [categories, brands, materials, finishes, applications, definitions, tags] =
    await Promise.all([
      prisma.category.findMany({
        where: { deletedAt: null },
        orderBy: [{ parentId: "asc" }, { sortOrder: "asc" }],
        select: { id: true, name: true, slug: true, parentId: true },
      }),
      prisma.brand.findMany({
        where: { deletedAt: null },
        orderBy: { sortOrder: "asc" },
        select: { id: true, name: true },
      }),
      prisma.material.findMany({
        where: { deletedAt: null },
        orderBy: { sortOrder: "asc" },
        select: { id: true, name: true },
      }),
      prisma.finish.findMany({
        where: { deletedAt: null },
        orderBy: { sortOrder: "asc" },
        select: { id: true, name: true, swatchHex: true },
      }),
      prisma.application.findMany({
        where: { deletedAt: null },
        orderBy: { sortOrder: "asc" },
        select: { id: true, name: true },
      }),
      prisma.specificationDefinition.findMany({
        orderBy: { sortOrder: "asc" },
        select: { id: true, key: true, label: true, unit: true, groupName: true },
      }),
      prisma.tag.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
    ]);

  return { categories, brands, materials, finishes, applications, definitions, tags };
}

/** Categories as a tree, with how many products each one holds. */
export async function listCategoriesForAdmin() {
  const categories = await prisma.category.findMany({
    where: { deletedAt: null },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    select: {
      id: true,
      name: true,
      slug: true,
      description: true,
      imageUrl: true,
      parentId: true,
      sortOrder: true,
      isHidden: true,
      isFeatured: true,
      _count: {
        select: { productsAsCategory: true, productsAsSubcategory: true, children: true },
      },
    },
  });

  const parents = categories.filter((category) => category.parentId === null);

  return parents.map((parent) => ({
    ...parent,
    children: categories.filter((category) => category.parentId === parent.id),
  }));
}

export type AdminCategory = Awaited<ReturnType<typeof listCategoriesForAdmin>>[number];

export async function listUsersForAdmin() {
  return prisma.user.findMany({
    where: { deletedAt: null },
    orderBy: [{ role: "desc" }, { fullName: "asc" }],
    select: {
      id: true,
      email: true,
      fullName: true,
      phone: true,
      companyName: true,
      role: true,
      isActive: true,
      emailVerifiedAt: true,
      lastLoginAt: true,
      createdAt: true,
      _count: { select: { inquiries: true, assignedInquiry: true } },
    },
  });
}

export type AdminUser = Awaited<ReturnType<typeof listUsersForAdmin>>[number];

export async function listAuditLog(page: number) {
  const total = await prisma.auditLog.count();
  const pageCount = Math.max(1, Math.ceil(total / 50));
  const current = Math.min(page, pageCount);

  const items = await prisma.auditLog.findMany({
    orderBy: { createdAt: "desc" },
    skip: (current - 1) * 50,
    take: 50,
    select: {
      id: true,
      action: true,
      entityType: true,
      entityId: true,
      summary: true,
      actorEmail: true,
      actorRole: true,
      ipAddress: true,
      createdAt: true,
      actor: { select: { fullName: true } },
    },
  });

  return { items, total, page: current, pageCount };
}

/** Editable site content, newest first so recent edits are easy to find. */
export async function listSiteContent() {
  return prisma.siteContent.findMany({
    orderBy: { key: "asc" },
    select: { key: true, value: true, description: true, updatedAt: true },
  });
}

/** Counts for the administrator overview. */
export async function getAdminSummary() {
  const [products, drafts, categories, users, managers, images] = await Promise.all([
    prisma.product.count({ where: { deletedAt: null } }),
    prisma.product.count({ where: { deletedAt: null, isPublished: false } }),
    prisma.category.count({ where: { deletedAt: null, parentId: null } }),
    prisma.user.count({ where: { deletedAt: null, role: "USER" } }),
    prisma.user.count({ where: { deletedAt: null, role: { in: ["MANAGER", "ADMIN"] } } }),
    prisma.productImage.count(),
  ]);

  return { products, drafts, categories, users, managers, images };
}

/**
 * Every photograph an administrator can choose from.
 *
 * The catalogue folder holds the site photography, keyed by file name without
 * its extension, which is how site content refers to an image. Reading the
 * folder rather than keeping a list means a photograph dropped in by hand is
 * offered too, and one that has been deleted stops being offered.
 */
export async function listAvailableImages(): Promise<
  Array<{ key: string; url: string; credit: string | null }>
> {
  const { readdir, readFile } = await import("node:fs/promises");
  const path = await import("node:path");

  const folder = path.resolve(process.cwd(), "public/uploads/catalogue");

  let files: string[] = [];

  try {
    files = await readdir(folder);
  } catch {
    return [];
  }

  // Photography carries an attribution record beside it. Showing the credit in
  // the picker is what stops a photograph being used somewhere it should not.
  let credits = new Map<string, string>();

  try {
    const raw = await readFile(path.join(folder, "attribution.json"), "utf8");
    const parsed = JSON.parse(raw) as { photos?: Array<{ key: string; credit?: string }> };

    credits = new Map(
      (parsed.photos ?? []).flatMap((photo) =>
        photo.credit ? [[photo.key, photo.credit] as const] : [],
      ),
    );
  } catch {
    // An unreadable attribution file is not a reason to hide the photographs.
  }

  return files
    .filter((file) => /\.(jpe?g|png|webp)$/i.test(file))
    .map((file) => {
      const key = file.replace(/\.[^.]+$/, "");
      return {
        key,
        url: `/uploads/catalogue/${file}`,
        credit: credits.get(key) ?? null,
      };
    })
    .sort((a, b) => a.key.localeCompare(b.key));
}

/** Everything the home page composer needs to offer as a choice. */
export async function getHomeComposerOptions() {
  const [products, categories, images, flagged, featuredCategories] = await Promise.all([
    prisma.product.findMany({
      where: { deletedAt: null, isPublished: true },
      orderBy: { name: "asc" },
      select: {
        code: true,
        name: true,
        category: { select: { name: true } },
        images: {
          take: 1,
          orderBy: [{ isPrimary: "desc" }, { sortOrder: "asc" }],
          select: { url: true },
        },
      },
    }),
    prisma.category.findMany({
      where: { deletedAt: null, parentId: null, isHidden: false },
      orderBy: { name: "asc" },
      select: {
        slug: true,
        name: true,
        imageUrl: true,
        _count: { select: { productsAsCategory: { where: { deletedAt: null, isPublished: true } } } },
      },
    }),
    listAvailableImages(),
    // What the site is showing right now, so a composer that has never been
    // saved still opens on the truth rather than on three empty lists.
    prisma.product.findMany({
      where: { deletedAt: null, isPublished: true, OR: [{ isFeatured: true }, { isPopular: true }] },
      orderBy: { sortOrder: "asc" },
      select: { code: true, isFeatured: true, isPopular: true },
    }),
    prisma.category.findMany({
      where: { deletedAt: null, parentId: null, isHidden: false, isFeatured: true },
      orderBy: { sortOrder: "asc" },
      select: { slug: true },
    }),
  ]);

  return {
    current: {
      featured: flagged.filter((row) => row.isFeatured).map((row) => row.code),
      popular: flagged.filter((row) => row.isPopular).map((row) => row.code),
      categories: featuredCategories.map((row) => row.slug),
    },
    products: products.map((product) => ({
      code: product.code,
      name: product.name,
      category: product.category.name,
      image: product.images[0]?.url ?? null,
    })),
    categories: categories.map((category) => ({
      slug: category.slug,
      name: category.name,
      image: category.imageUrl,
      count: category._count.productsAsCategory,
    })),
    images,
  };
}

/**
 * One person, and everything the shop knows about them.
 *
 * Enough to answer a telephone call: who they are, what they have asked for,
 * what was said back, and whether their account is in a fit state to sign in.
 */
export async function getUserForAdmin(id: string) {
  const user = await prisma.user.findFirst({
    where: { id, deletedAt: null },
    select: {
      id: true,
      email: true,
      fullName: true,
      phone: true,
      companyName: true,
      role: true,
      isActive: true,
      emailVerifiedAt: true,
      lastLoginAt: true,
      createdAt: true,
      inquiries: {
        orderBy: { createdAt: "desc" },
        take: 20,
        select: {
          id: true,
          reference: true,
          status: true,
          itemCount: true,
          createdAt: true,
          lastActivityAt: true,
          unreadForManager: true,
        },
      },
      assignedInquiry: {
        where: { status: { notIn: ["CLOSED", "COMPLETED"] } },
        orderBy: { lastActivityAt: "desc" },
        take: 20,
        select: {
          id: true,
          reference: true,
          status: true,
          fullName: true,
          lastActivityAt: true,
        },
      },
      sessions: {
        orderBy: { lastUsedAt: "desc" },
        select: { id: true, createdAt: true, lastUsedAt: true, ipAddress: true },
      },
      _count: { select: { inquiries: true, assignedInquiry: true } },
    },
  });

  if (!user) return null;

  // Inquiries sent as a guest and later claimed are already attached by user
  // id. Anything still sitting against the same address is shown too, because
  // to the person on the telephone it is all one history.
  const guestInquiries = await prisma.inquiry.findMany({
    where: { userId: null, email: user.email },
    orderBy: { createdAt: "desc" },
    take: 10,
    select: {
      id: true,
      reference: true,
      status: true,
      itemCount: true,
      createdAt: true,
    },
  });

  const activity = await prisma.auditLog.findMany({
    where: { OR: [{ actorUserId: user.id }, { entityType: "User", entityId: user.id }] },
    orderBy: { createdAt: "desc" },
    take: 12,
    select: { id: true, action: true, summary: true, createdAt: true },
  });

  const demand = await prisma.inquiryItem.aggregate({
    where: {
      inquiry: { OR: [{ userId: user.id }, { userId: null, email: user.email }] },
    },
    _sum: { quantity: true },
  });

  return {
    ...user,
    guestInquiries,
    activity,
    piecesRequested: demand._sum.quantity ?? 0,
  };
}

export type AdminUserDetail = NonNullable<Awaited<ReturnType<typeof getUserForAdmin>>>;
