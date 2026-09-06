import "server-only";

import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/server/db/prisma";
import type { CatalogueQuery } from "@/server/validation/catalogue";
import { PRODUCTS_PER_PAGE } from "@/server/validation/catalogue";

/**
 * Catalogue data access.
 *
 * This is the only module that talks to Prisma about products and categories.
 * Services and pages call these functions; nothing above this layer knows what
 * the tables are called.
 */

/** Columns every product card needs, and nothing more. */
const productCardSelect = {
  id: true,
  name: true,
  slug: true,
  code: true,
  shortDescription: true,
  availability: true,
  isFeatured: true,
  category: { select: { name: true, slug: true } },
  subcategory: { select: { name: true, slug: true } },
  brand: { select: { name: true, slug: true } },
  material: { select: { name: true } },
  finish: { select: { name: true, swatchHex: true } },
  images: {
    select: { url: true, alt: true },
    orderBy: [{ isPrimary: "desc" }, { sortOrder: "asc" }],
    take: 2,
  },
} satisfies Prisma.ProductSelect;

export type ProductCard = Prisma.ProductGetPayload<{
  select: typeof productCardSelect;
}>;

const visible: Prisma.ProductWhereInput = {
  isPublished: true,
  deletedAt: null,
};

type FilterDimension =
  | "category"
  | "subcategory"
  | "brand"
  | "material"
  | "finish"
  | "application"
  | "availability";

/**
 * Builds the where clause for a catalogue query.
 *
 * `exclude` leaves one dimension out, which is what facet counting needs: the
 * number shown beside "Matt black" should be the count you would get if you
 * added that finish, not the count you already have with it applied.
 */
function buildWhere(
  query: CatalogueQuery,
  exclude?: FilterDimension,
): Prisma.ProductWhereInput {
  const and: Prisma.ProductWhereInput[] = [visible];

  if (exclude !== "category" && query.category.length > 0) {
    // Selecting a parent category also shows everything filed beneath it.
    and.push({
      OR: [
        { category: { slug: { in: query.category } } },
        { subcategory: { parent: { slug: { in: query.category } } } },
      ],
    });
  }

  if (exclude !== "subcategory" && query.subcategory.length > 0) {
    and.push({ subcategory: { slug: { in: query.subcategory } } });
  }

  if (exclude !== "brand" && query.brand.length > 0) {
    and.push({ brand: { slug: { in: query.brand } } });
  }

  if (exclude !== "material" && query.material.length > 0) {
    and.push({
      OR: [
        { material: { slug: { in: query.material } } },
        { variants: { some: { isActive: true, material: { slug: { in: query.material } } } } },
      ],
    });
  }

  if (exclude !== "finish" && query.finish.length > 0) {
    // A finish offered only as a variant still counts as available.
    and.push({
      OR: [
        { finish: { slug: { in: query.finish } } },
        { variants: { some: { isActive: true, finish: { slug: { in: query.finish } } } } },
      ],
    });
  }

  if (exclude !== "application" && query.application.length > 0) {
    and.push({ application: { slug: { in: query.application } } });
  }

  if (exclude !== "availability" && query.availability.length > 0) {
    and.push({ availability: { in: query.availability } });
  }

  return { AND: and };
}

/**
 * Ranked product identifiers for a search term.
 *
 * Full text ranking runs first. When it finds nothing, a trigram pass catches
 * misspellings and partial product codes, because a customer searching for a
 * door handle should not be punished for typing "handel".
 */
async function searchProductIds(
  term: string,
): Promise<{ ids: string[]; approximate: boolean }> {
  const exact = await prisma.$queryRaw<Array<{ id: string }>>`
    SELECT p.id
    FROM products p
    LEFT JOIN brands b ON b.id = p."brandId"
    LEFT JOIN categories c ON c.id = p."categoryId"
    WHERE p."isPublished" = true
      AND p."deletedAt" IS NULL
      AND (
        p."searchVector" @@ websearch_to_tsquery('english', ${term})
        OR p."searchVector" @@ websearch_to_tsquery('simple', ${term})
        OR p.code ILIKE ${"%" + term + "%"}
        OR b.name ILIKE ${"%" + term + "%"}
        OR c.name ILIKE ${"%" + term + "%"}
      )
    ORDER BY
      ts_rank(p."searchVector", websearch_to_tsquery('simple', ${term})) DESC,
      p."isFeatured" DESC,
      p."sortOrder" ASC
    LIMIT 400
  `;

  if (exact.length > 0) {
    return { ids: exact.map((row) => row.id), approximate: false };
  }

  // Nothing matched exactly. Lower the trigram threshold and try again so that
  // a near miss still returns the shelf the customer was looking for.
  const fuzzy = await prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SET LOCAL pg_trgm.word_similarity_threshold = 0.4`;

    return tx.$queryRaw<Array<{ id: string }>>`
      SELECT p.id,
             GREATEST(
               word_similarity(${term}, p.name),
               word_similarity(${term}, COALESCE(p."shortDescription", '')),
               word_similarity(${term}, c.name)
             ) AS score
      FROM products p
      JOIN categories c ON c.id = p."categoryId"
      WHERE p."isPublished" = true
        AND p."deletedAt" IS NULL
        AND (
          ${term} <% p.name
          OR ${term} <% COALESCE(p."shortDescription", '')
          OR ${term} <% c.name
        )
      ORDER BY score DESC, p."sortOrder" ASC
      LIMIT 100
    `;
  });

  return { ids: fuzzy.map((row) => row.id), approximate: fuzzy.length > 0 };
}

export type CatalogueResult = {
  items: ProductCard[];
  total: number;
  page: number;
  pageCount: number;
  /** True when results came from the forgiving search rather than an exact match. */
  approximate: boolean;
};

export async function listProducts(query: CatalogueQuery): Promise<CatalogueResult> {
  let where = buildWhere(query);
  let rankedIds: string[] | null = null;
  let approximate = false;

  if (query.q) {
    const search = await searchProductIds(query.q);
    rankedIds = search.ids;
    approximate = search.approximate;

    if (rankedIds.length === 0) {
      return { items: [], total: 0, page: 1, pageCount: 0, approximate: false };
    }

    where = { AND: [where, { id: { in: rankedIds } }] };
  }

  const total = await prisma.product.count({ where });
  const pageCount = Math.max(1, Math.ceil(total / PRODUCTS_PER_PAGE));
  const page = Math.min(query.page, pageCount);
  const skip = (page - 1) * PRODUCTS_PER_PAGE;

  // Relevance ordering only means something when there is a search term. For
  // an unsearched catalogue it falls back to the curated order.
  const orderBy: Prisma.ProductOrderByWithRelationInput[] =
    query.sort === "newest"
      ? [{ publishedAt: "desc" }, { name: "asc" }]
      : query.sort === "name"
        ? [{ name: "asc" }]
        : query.sort === "popular"
          ? [{ viewCount: "desc" }, { name: "asc" }]
          : [{ isFeatured: "desc" }, { sortOrder: "asc" }, { name: "asc" }];

  if (rankedIds && query.sort === "relevance") {
    // Order by search rank, which the database cannot express through Prisma.
    const pageIds = rankedIds.slice(skip, skip + PRODUCTS_PER_PAGE);
    const items = await prisma.product.findMany({
      where: { AND: [where, { id: { in: pageIds } }] },
      select: productCardSelect,
    });

    const position = new Map(pageIds.map((id, index) => [id, index]));
    items.sort((a, b) => (position.get(a.id) ?? 0) - (position.get(b.id) ?? 0));

    return { items, total, page, pageCount, approximate };
  }

  const items = await prisma.product.findMany({
    where,
    select: productCardSelect,
    orderBy,
    skip,
    take: PRODUCTS_PER_PAGE,
  });

  return { items, total, page, pageCount, approximate };
}

export type FacetOption = {
  slug: string;
  name: string;
  count: number;
  swatchHex?: string | null;
  /** Present on subcategories so the filter panel can group them. */
  parentSlug?: string | null;
};

export type CatalogueFacets = {
  categories: Array<FacetOption & { children: FacetOption[] }>;
  brands: FacetOption[];
  materials: FacetOption[];
  finishes: FacetOption[];
  applications: FacetOption[];
  availability: Array<{ value: string; count: number }>;
};

/**
 * Counts for every filter option, each computed with its own dimension left
 * out so the numbers describe what would happen if you clicked it.
 */
export async function getCatalogueFacets(
  query: CatalogueQuery,
): Promise<CatalogueFacets> {
  const searchIds = query.q ? (await searchProductIds(query.q)).ids : null;

  const scope = (dimension: FilterDimension): Prisma.ProductWhereInput => {
    const base = buildWhere(query, dimension);
    return searchIds ? { AND: [base, { id: { in: searchIds } }] } : base;
  };

  const [
    categoryRows,
    subcategoryRows,
    brandRows,
    materialRows,
    finishRows,
    variantFinishRows,
    applicationRows,
    availabilityRows,
    taxonomy,
  ] = await Promise.all([
    prisma.product.groupBy({
      by: ["categoryId"],
      where: scope("category"),
      _count: { _all: true },
    }),
    prisma.product.groupBy({
      by: ["subcategoryId"],
      where: scope("subcategory"),
      _count: { _all: true },
    }),
    prisma.product.groupBy({
      by: ["brandId"],
      where: scope("brand"),
      _count: { _all: true },
    }),
    prisma.product.groupBy({
      by: ["materialId"],
      where: scope("material"),
      _count: { _all: true },
    }),
    prisma.product.groupBy({
      by: ["finishId"],
      where: scope("finish"),
      _count: { _all: true },
    }),
    // Products whose finish is only offered on a variant still belong in the
    // count for that finish.
    prisma.productVariant.findMany({
      where: { isActive: true, product: scope("finish") },
      select: { finishId: true, productId: true },
      distinct: ["finishId", "productId"],
    }),
    prisma.product.groupBy({
      by: ["applicationId"],
      where: scope("application"),
      _count: { _all: true },
    }),
    prisma.product.groupBy({
      by: ["availability"],
      where: scope("availability"),
      _count: { _all: true },
    }),
    getTaxonomy(),
  ]);

  const countBy = <T extends { _count: { _all: number } }>(
    rows: T[],
    key: keyof T,
  ): Map<string, number> => {
    const map = new Map<string, number>();
    for (const row of rows) {
      const id = row[key];
      if (typeof id === "string") map.set(id, row._count._all);
    }
    return map;
  };

  const categoryCounts = countBy(categoryRows, "categoryId");
  const subcategoryCounts = countBy(subcategoryRows, "subcategoryId");
  const brandCounts = countBy(brandRows, "brandId");
  const materialCounts = countBy(materialRows, "materialId");
  const finishCounts = countBy(finishRows, "finishId");
  const applicationCounts = countBy(applicationRows, "applicationId");

  // Merge product level and variant level finish counts without double counting.
  const finishProducts = new Map<string, Set<string>>();
  for (const row of variantFinishRows) {
    if (!row.finishId) continue;
    const set = finishProducts.get(row.finishId) ?? new Set<string>();
    set.add(row.productId);
    finishProducts.set(row.finishId, set);
  }

  const categoriesWithCounts = taxonomy.categories.map((category) => {
    const childCount = category.children.reduce(
      (total, child) => total + (subcategoryCounts.get(child.id) ?? 0),
      0,
    );

    return {
      slug: category.slug,
      name: category.name,
      count: (categoryCounts.get(category.id) ?? 0) + childCount,
      children: category.children.map((child) => ({
        slug: child.slug,
        name: child.name,
        parentSlug: category.slug,
        count: subcategoryCounts.get(child.id) ?? 0,
      })),
    };
  });

  return {
    categories: categoriesWithCounts,
    brands: taxonomy.brands.map((brand) => ({
      slug: brand.slug,
      name: brand.name,
      count: brandCounts.get(brand.id) ?? 0,
    })),
    materials: taxonomy.materials.map((material) => ({
      slug: material.slug,
      name: material.name,
      count: materialCounts.get(material.id) ?? 0,
    })),
    finishes: taxonomy.finishes.map((finish) => ({
      slug: finish.slug,
      name: finish.name,
      swatchHex: finish.swatchHex,
      count: Math.max(
        finishCounts.get(finish.id) ?? 0,
        finishProducts.get(finish.id)?.size ?? 0,
      ),
    })),
    applications: taxonomy.applications.map((application) => ({
      slug: application.slug,
      name: application.name,
      count: applicationCounts.get(application.id) ?? 0,
    })),
    availability: availabilityRows.map((row) => ({
      value: row.availability,
      count: row._count._all,
    })),
  };
}

/** Every administrator managed filter value, in administrator defined order. */
export async function getTaxonomy() {
  const [categories, brands, materials, finishes, applications] = await Promise.all([
    prisma.category.findMany({
      where: { parentId: null, isHidden: false, deletedAt: null },
      orderBy: { sortOrder: "asc" },
      select: {
        id: true,
        name: true,
        slug: true,
        description: true,
        imageUrl: true,
        isFeatured: true,
        children: {
          where: { isHidden: false, deletedAt: null },
          orderBy: { sortOrder: "asc" },
          select: { id: true, name: true, slug: true },
        },
      },
    }),
    prisma.brand.findMany({
      where: { isHidden: false, deletedAt: null },
      orderBy: { sortOrder: "asc" },
      select: { id: true, name: true, slug: true },
    }),
    prisma.material.findMany({
      where: { isHidden: false, deletedAt: null },
      orderBy: { sortOrder: "asc" },
      select: { id: true, name: true, slug: true },
    }),
    prisma.finish.findMany({
      where: { isHidden: false, deletedAt: null },
      orderBy: { sortOrder: "asc" },
      select: { id: true, name: true, slug: true, swatchHex: true },
    }),
    prisma.application.findMany({
      where: { isHidden: false, deletedAt: null },
      orderBy: { sortOrder: "asc" },
      select: { id: true, name: true, slug: true },
    }),
  ]);

  return { categories, brands, materials, finishes, applications };
}

export async function getProductBySlug(slug: string) {
  return prisma.product.findFirst({
    where: { slug, ...visible },
    select: {
      id: true,
      name: true,
      slug: true,
      code: true,
      description: true,
      shortDescription: true,
      dimensions: true,
      availability: true,
      metaTitle: true,
      metaDescription: true,
      publishedAt: true,
      updatedAt: true,
      category: { select: { id: true, name: true, slug: true } },
      subcategory: { select: { name: true, slug: true } },
      brand: { select: { name: true, slug: true, summary: true } },
      material: { select: { name: true } },
      finish: { select: { name: true, swatchHex: true } },
      application: { select: { name: true } },
      tags: { select: { name: true, slug: true } },
      images: {
        select: { id: true, url: true, alt: true, credit: true },
        orderBy: [{ isPrimary: "desc" }, { sortOrder: "asc" }],
      },
      variants: {
        where: { isActive: true },
        orderBy: { sortOrder: "asc" },
        select: {
          id: true,
          name: true,
          code: true,
          size: true,
          colour: true,
          model: true,
          availability: true,
          material: { select: { name: true } },
          finish: { select: { name: true, swatchHex: true } },
        },
      },
      specifications: {
        orderBy: { sortOrder: "asc" },
        select: {
          id: true,
          value: true,
          definition: {
            select: { key: true, label: true, unit: true, groupName: true, sortOrder: true },
          },
        },
      },
      documents: {
        orderBy: { sortOrder: "asc" },
        select: { id: true, title: true, storagePath: true, fileSize: true, mimeType: true },
      },
    },
  });
}

export type ProductDetail = NonNullable<Awaited<ReturnType<typeof getProductBySlug>>>;

/** Other products a customer looking at this one is likely to want. */
export async function listRelatedProducts(
  productId: string,
  categoryId: string,
  limit = 4,
): Promise<ProductCard[]> {
  return prisma.product.findMany({
    where: { ...visible, categoryId, id: { not: productId } },
    select: productCardSelect,
    orderBy: [{ isFeatured: "desc" }, { sortOrder: "asc" }],
    take: limit,
  });
}

export async function listFeaturedCategories(limit = 6) {
  return prisma.category.findMany({
    where: { parentId: null, isHidden: false, deletedAt: null, isFeatured: true },
    orderBy: { sortOrder: "asc" },
    take: limit,
    select: {
      id: true,
      name: true,
      slug: true,
      description: true,
      imageUrl: true,
      _count: { select: { productsAsCategory: { where: visible } } },
    },
  });
}

export async function listProductsByFlag(
  flag: "isFeatured" | "isPopular",
  limit = 8,
): Promise<ProductCard[]> {
  return prisma.product.findMany({
    where: { ...visible, [flag]: true },
    select: productCardSelect,
    orderBy: { sortOrder: "asc" },
    take: limit,
  });
}

/**
 * Headline figures for the home page. Counted rather than written into the
 * copy, so the page can never claim a catalogue that is not there.
 */
export async function getCatalogueSummary() {
  const [products, categories, finishes, brands] = await Promise.all([
    prisma.product.count({ where: visible }),
    prisma.category.count({
      where: { parentId: null, isHidden: false, deletedAt: null },
    }),
    prisma.finish.count({ where: { isHidden: false, deletedAt: null } }),
    prisma.brand.count({ where: { isHidden: false, deletedAt: null } }),
  ]);

  return { products, categories, finishes, brands };
}

/**
 * Products named by product code, for the points marked on the hero
 * photograph. Codes are used rather than identifiers so that the marked point
 * survives a reseed and reads clearly to whoever edits the content.
 */
export async function listProductsByCodes(codes: string[]): Promise<ProductCard[]> {
  if (codes.length === 0) return [];

  return prisma.product.findMany({
    where: { ...visible, code: { in: codes } },
    select: productCardSelect,
  });
}

/**
 * Products in the order an administrator arranged them.
 *
 * The order comes from the home page arrangement rather than from the database,
 * so it is preserved here rather than left to whatever the query returns. A
 * code that no longer matches a published product simply drops out, which is
 * what should happen when a piece is withdrawn: the row closes up instead of
 * showing a gap.
 */
export async function listProductsInOrder(codes: string[]): Promise<ProductCard[]> {
  const products = await listProductsByCodes(codes);
  const byCode = new Map(products.map((product) => [product.code, product]));

  return codes.flatMap((code) => {
    const product = byCode.get(code);
    return product ? [product] : [];
  });
}

/** Categories in the order an administrator arranged them, by slug. */
export async function listCategoriesInOrder(slugs: string[]) {
  if (slugs.length === 0) return [];

  const categories = await prisma.category.findMany({
    where: { slug: { in: slugs }, isHidden: false, deletedAt: null },
    select: {
      id: true,
      name: true,
      slug: true,
      description: true,
      imageUrl: true,
      _count: { select: { productsAsCategory: { where: visible } } },
    },
  });

  const bySlug = new Map(categories.map((category) => [category.slug, category]));

  return slugs.flatMap((slug) => {
    const category = bySlug.get(slug);
    return category ? [category] : [];
  });
}

/** Slugs for the sitemap. */
export async function listPublishedProductSlugs() {
  return prisma.product.findMany({
    where: visible,
    select: { slug: true, updatedAt: true },
    orderBy: { sortOrder: "asc" },
  });
}

export async function listVisibleCategorySlugs() {
  return prisma.category.findMany({
    where: { isHidden: false, deletedAt: null },
    select: { slug: true, updatedAt: true },
  });
}

/** Counts a product view without blocking the response. */
export async function recordProductView(productId: string): Promise<void> {
  await prisma.product.update({
    where: { id: productId },
    data: { viewCount: { increment: 1 } },
  });
}

/**
 * Every category the shop sells into, with how much is in each.
 *
 * Drawn on the home page as an index rather than as another grid of pictures.
 * A customer who knows what they came for should be able to read the whole
 * range in one glance instead of scrolling past five photographs to find out
 * that the sixth thing they wanted is stocked.
 */
export async function listCategoryIndex() {
  return prisma.category.findMany({
    where: { parentId: null, isHidden: false, deletedAt: null },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    select: {
      id: true,
      name: true,
      slug: true,
      _count: { select: { productsAsCategory: { where: visible } } },
    },
  });
}
