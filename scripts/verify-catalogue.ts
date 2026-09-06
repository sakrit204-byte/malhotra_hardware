/**
 * Checks the properties the administrator platform depends on.
 *
 * Everything here is something an administrator can break from a screen, with
 * no error to warn them: a relation cleared in a way Prisma refuses on a
 * create, a product left with no photograph leading it, a code with a hyphen in
 * it going out to a customer, a category buried three levels deep where the
 * menu only draws two.
 *
 * Run with: npm run verify:catalogue
 */

import "dotenv/config";

import { PrismaPg } from "@prisma/adapter-pg";

import { PrismaClient } from "../src/generated/prisma/client";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) throw new Error("DATABASE_URL is not set.");

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });

let failures = 0;

function check(description: string, passed: boolean, detail = "") {
  if (!passed) failures += 1;
  console.log(
    `  ${passed ? "pass" : "FAIL"}  ${description}${detail ? ` (${detail})` : ""}`,
  );
}

/**
 * The shape of an optional relation.
 *
 * This is the one that bit: `disconnect` is correct on an update and invalid on
 * a create, and getting it wrong throws at the database rather than at the
 * keyboard, so a saved product simply vanished with no message.
 */
async function testOptionalRelation() {
  console.log("\nOptional relations");

  const { optionalRelation } = await import("../src/server/db/relations");

  check(
    "a chosen relation connects, whether creating or updating",
    JSON.stringify(optionalRelation("abc", "create")) ===
      JSON.stringify({ connect: { id: "abc" } }) &&
      JSON.stringify(optionalRelation("abc", "update")) ===
        JSON.stringify({ connect: { id: "abc" } }),
  );

  check(
    "an empty relation is left out of a create, where there is nothing to detach",
    optionalRelation(null, "create") === undefined,
  );

  check(
    "an empty relation detaches on an update",
    JSON.stringify(optionalRelation(null, "update")) ===
      JSON.stringify({ disconnect: true }),
  );
}

async function testProducts() {
  console.log("\nProducts");

  const products = await prisma.product.findMany({
    where: { deletedAt: null },
    select: {
      id: true,
      name: true,
      code: true,
      slug: true,
      isPublished: true,
      categoryId: true,
      subcategoryId: true,
      images: { select: { isPrimary: true } },
    },
  });

  const hyphenated = products.filter((product) => product.code.includes("-"));
  check(
    "no product code contains a hyphen",
    hyphenated.length === 0,
    hyphenated.map((product) => product.code).join(", "),
  );

  const codes = new Set(products.map((product) => product.code));
  check("no two products share a code", codes.size === products.length);

  const slugs = new Set(products.map((product) => product.slug));
  check("no two products share a web address", slugs.size === products.length);

  const withImages = products.filter((product) => product.images.length > 0);
  const missingLead = withImages.filter(
    (product) => !product.images.some((image) => image.isPrimary),
  );
  check(
    "every product with photographs has one that leads",
    missingLead.length === 0,
    missingLead.map((product) => product.name).join(", "),
  );

  const twoLeads = withImages.filter(
    (product) => product.images.filter((image) => image.isPrimary).length > 1,
  );
  check(
    "no product has two photographs claiming to lead",
    twoLeads.length === 0,
    twoLeads.map((product) => product.name).join(", "),
  );

  const published = products.filter((product) => product.isPublished);
  const unphotographed = published.filter((product) => product.images.length === 0);
  check(
    "every published product has at least one photograph",
    unphotographed.length === 0,
    unphotographed.map((product) => product.name).join(", "),
  );

  // A soft deleted product must not be reachable from the catalogue, even
  // though its row is deliberately kept for the inquiries that mention it.
  const removedButVisible = await prisma.product.count({
    where: { deletedAt: { not: null }, isPublished: true },
  });
  check("nothing removed is still published", removedButVisible === 0);
}

async function testCategories() {
  console.log("\nCategories");

  const categories = await prisma.category.findMany({
    where: { deletedAt: null },
    select: { id: true, name: true, slug: true, parentId: true },
  });

  const byId = new Map(categories.map((category) => [category.id, category]));

  const tooDeep = categories.filter((category) => {
    if (!category.parentId) return false;
    const parent = byId.get(category.parentId);
    return Boolean(parent?.parentId);
  });

  check(
    "categories go two levels deep and no further",
    tooDeep.length === 0,
    tooDeep.map((category) => category.name).join(", "),
  );

  const orphans = categories.filter(
    (category) => category.parentId !== null && !byId.get(category.parentId),
  );
  check(
    "no subcategory points at a parent that has gone",
    orphans.length === 0,
    orphans.map((category) => category.name).join(", "),
  );

  const slugs = new Set(categories.map((category) => category.slug));
  check("no two categories share a web address", slugs.size === categories.length);

  const stranded = await prisma.product.count({
    where: { deletedAt: null, category: { deletedAt: { not: null } } },
  });
  check("no product sits in a category that has been removed", stranded === 0);
}

/** Photographs on disk and photographs in the database describe one another. */
async function testImages() {
  console.log("\nPhotographs");

  const { access } = await import("node:fs/promises");
  const path = await import("node:path");

  const publicRoot = path.resolve(
    process.cwd(),
    process.env.STORAGE_PUBLIC_DIR ?? "./public/uploads",
  );

  const images = await prisma.productImage.findMany({
    select: { id: true, url: true, alt: true },
  });

  const missing: string[] = [];

  for (const image of images) {
    if (!image.url.startsWith("/uploads/")) continue;

    const target = path.resolve(publicRoot, image.url.slice("/uploads/".length));

    try {
      await access(target);
    } catch {
      missing.push(image.url);
    }
  }

  check(
    "every photograph in the catalogue is a file that exists",
    missing.length === 0,
    missing.slice(0, 3).join(", "),
  );

  const undescribed = images.filter((image) => !image.alt || image.alt.trim().length === 0);
  check(
    "every photograph carries a description for a screen reader",
    undescribed.length === 0,
    `${undescribed.length} without one`,
  );
}

/**
 * The catalogue can grow without a migration.
 *
 * A specification is a row pointing at a definition rather than a column, which
 * is what lets an administrator record something new. If a specification ever
 * points at a definition that has gone, the product page would show a blank
 * row, so it is worth checking rather than assuming.
 */
async function testSpecifications() {
  console.log("\nSpecifications");

  const definitions = await prisma.specificationDefinition.findMany({
    select: { id: true, key: true },
  });

  const keys = new Set(definitions.map((definition) => definition.key));
  check("no two attributes share a key", keys.size === definitions.length);

  const known = new Set(definitions.map((definition) => definition.id));
  const specifications = await prisma.productSpecification.findMany({
    select: { definitionId: true },
  });

  check(
    "every recorded specification points at an attribute that exists",
    specifications.every((specification) => known.has(specification.definitionId)),
  );

  const variants = await prisma.productVariant.findMany({
    select: { code: true },
  });

  const variantCodes = new Set(variants.map((variant) => variant.code));
  check("no two options share a code", variantCodes.size === variants.length);
  check(
    "no option code contains a hyphen",
    variants.every((variant) => !variant.code.includes("-")),
  );
}

/** Somebody has to be able to get back in. */
async function testAdministrators() {
  console.log("\nAdministrators");

  const admins = await prisma.user.count({
    where: { role: "ADMIN", isActive: true, deletedAt: null },
  });

  check("at least one administrator can still sign in", admins > 0, `${admins} active`);
}

async function main() {
  console.log("Verifying the catalogue and the administrator platform");

  await testOptionalRelation();
  await testProducts();
  await testCategories();
  await testImages();
  await testSpecifications();
  await testAdministrators();

  console.log(
    failures === 0
      ? "\nAll catalogue invariants hold."
      : `\n${failures} ${failures === 1 ? "check" : "checks"} failed.`,
  );

  if (failures > 0) process.exitCode = 1;
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
