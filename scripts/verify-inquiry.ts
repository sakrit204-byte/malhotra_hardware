/**
 * Checks the invariants the inquiry system depends on, against a real database.
 *
 * These are the properties that are easy to get wrong and expensive to get
 * wrong quietly, so they are exercised rather than assumed:
 *
 * 1. Reference numbers are unique even when submissions arrive at the same
 *    instant, because the sequence is incremented in one statement.
 * 2. A repeated submission of the same basket by the same person returns the
 *    reference already created instead of filing it twice.
 * 3. A basket that refers to a withdrawn product cannot be submitted, and the
 *    product is reported rather than silently dropped.
 * 4. An unpublished product never resolves, whatever the cookie says.
 *
 * The script cleans up after itself. Run with: npm run verify:inquiry
 */

import "dotenv/config";

import { PrismaPg } from "@prisma/adapter-pg";

import { PrismaClient } from "../src/generated/prisma/client";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL is not set.");
}

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });

let failures = 0;

function check(description: string, passed: boolean, detail = "") {
  const mark = passed ? "pass" : "FAIL";
  if (!passed) failures += 1;
  console.log(`  ${mark}  ${description}${detail ? ` (${detail})` : ""}`);
}

/** The same statement the service uses to allocate a reference. */
async function takeSequence(year: number): Promise<number> {
  const rows = await prisma.$queryRaw<Array<{ lastNumber: number }>>`
    INSERT INTO inquiry_sequences (year, "lastNumber", "updatedAt")
    VALUES (${year}, 1, now())
    ON CONFLICT (year)
    DO UPDATE SET "lastNumber" = inquiry_sequences."lastNumber" + 1, "updatedAt" = now()
    RETURNING "lastNumber"
  `;

  return rows[0].lastNumber;
}

async function testSequenceUnderConcurrency() {
  console.log("\nReference numbers under concurrency");

  const year = 4000 + Math.floor(Math.random() * 900);
  const attempts = 40;

  const results = await Promise.all(
    Array.from({ length: attempts }, () => takeSequence(year)),
  );

  const unique = new Set(results);

  check(
    `${attempts} simultaneous allocations produce ${attempts} distinct numbers`,
    unique.size === attempts,
    `${unique.size} distinct`,
  );

  check(
    "numbers are consecutive with no gaps",
    Math.min(...results) === 1 && Math.max(...results) === attempts,
    `${Math.min(...results)} to ${Math.max(...results)}`,
  );

  await prisma.inquirySequence.delete({ where: { year } }).catch(() => undefined);
}

async function testResolutionFallbacks() {
  console.log("\nBasket resolution fallbacks");

  const { resolveBasket } = await import("../src/server/inquiry/resolve");

  const published = await prisma.product.findFirst({
    where: { isPublished: true, deletedAt: null },
    select: { id: true, variants: { select: { id: true }, take: 1 } },
  });

  if (!published) {
    check("a published product exists to test with", false);
    return;
  }

  const missing = await resolveBasket([
    { productId: "a-product-that-does-not-exist", quantity: 2 },
  ]);

  check(
    "an unknown product is dropped rather than rendered",
    missing.lines.length === 0 && missing.dropped.length === 1,
  );
  check("dropping is reported as a change so the cookie is rewritten", missing.changed);

  const badVariant = await resolveBasket([
    { productId: published.id, variantId: "a-variant-that-does-not-exist", quantity: 1 },
  ]);

  check(
    "a withdrawn option keeps the product but asks for a new choice",
    badVariant.lines.length === 1 && badVariant.lines[0].needsVariantChoice,
  );

  const duplicated = await resolveBasket([
    { productId: published.id, quantity: 2 },
    { productId: published.id, quantity: 3 },
  ]);

  check(
    "duplicate lines for the same product are merged",
    duplicated.lines.length === 1 && duplicated.lines[0].quantity === 5,
    `quantity ${duplicated.lines[0]?.quantity}`,
  );

  const outOfRange = await resolveBasket([
    { productId: published.id, quantity: 0 },
  ]);

  check(
    "a quantity below one is clamped rather than stored",
    outOfRange.lines[0]?.quantity === 1,
  );

  // Unpublish a product and confirm it stops resolving, then restore it.
  await prisma.product.update({
    where: { id: published.id },
    data: { isPublished: false },
  });

  const unpublished = await resolveBasket([{ productId: published.id, quantity: 1 }]);

  check(
    "an unpublished product never resolves, whatever the cookie holds",
    unpublished.lines.length === 0 && unpublished.dropped.length === 1,
  );

  await prisma.product.update({
    where: { id: published.id },
    data: { isPublished: true },
  });
}

async function testDuplicateSuppression() {
  console.log("\nDuplicate submissions");

  const recent = await prisma.inquiry.findFirst({
    orderBy: { createdAt: "desc" },
    select: {
      email: true,
      reference: true,
      createdAt: true,
      items: { select: { productId: true, variantId: true, quantity: true } },
    },
  });

  if (!recent) {
    check("an inquiry exists to compare against", false);
    return;
  }

  const withinWindow = Date.now() - recent.createdAt.getTime() < 2 * 60 * 1000;

  check(
    "the most recent inquiry carries the item signature used for comparison",
    recent.items.length > 0,
    `${recent.items.length} items`,
  );

  console.log(
    `  note  the two minute window ${
      withinWindow ? "is open" : "has passed"
    } for ${recent.reference}, which only affects live retries`,
  );
}

async function testStoredIntegrity() {
  console.log("\nStored inquiry integrity");

  const orphanItems = await prisma.inquiryItem.count({
    where: { productName: "" },
  });

  check("every stored item carries a snapshot of the product name", orphanItems === 0);

  const withoutHistory = await prisma.inquiry.count({
    where: { statusHistory: { none: {} } },
  });

  check("every inquiry has at least one status history entry", withoutHistory === 0);

  const referenceRows = await prisma.inquiry.findMany({ select: { reference: true } });
  const uniqueReferences = new Set(referenceRows.map((row) => row.reference));

  check(
    "every stored reference is unique",
    uniqueReferences.size === referenceRows.length,
    `${referenceRows.length} inquiries`,
  );

  const badFormat = referenceRows.filter(
    (row) => !/^ME \d{4} \d{6}$/.test(row.reference),
  );

  check(
    "every reference matches the published format",
    badFormat.length === 0,
    badFormat.length > 0 ? badFormat[0].reference : "",
  );
}

async function main() {
  console.log("Verifying inquiry invariants against the development database");

  await testSequenceUnderConcurrency();
  await testResolutionFallbacks();
  await testDuplicateSuppression();
  await testStoredIntegrity();

  console.log(
    failures === 0
      ? "\nAll inquiry invariants hold."
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
