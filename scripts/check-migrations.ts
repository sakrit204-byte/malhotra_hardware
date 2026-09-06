/**
 * Guards the migration history against a known generator quirk.
 *
 * `products.searchVector` is a PostgreSQL generated column. Prisma cannot model
 * a generated expression, so it reads the expression as a column default and
 * every `prisma migrate dev` offers to drop it. That statement is invalid on a
 * generated column: PostgreSQL rejects it, the migration fails halfway, and
 * whatever ran before it stays applied. That is exactly how the search indexes
 * were once dropped from a working database.
 *
 * So: after generating a migration, delete any line matching the pattern below,
 * and this check will confirm it is gone before the change is committed.
 *
 * Run with: npm run check:migrations
 */

import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";

const MIGRATIONS_DIR = path.join(process.cwd(), "prisma", "migrations");

type Problem = { file: string; line: number; text: string; reason: string };

const forbidden: Array<{ pattern: RegExp; reason: string }> = [
  {
    pattern: /ALTER COLUMN "searchVector" DROP DEFAULT/i,
    reason:
      "searchVector is a generated column. PostgreSQL rejects this and the migration will fail halfway. Delete the line.",
  },
  {
    pattern: /DROP INDEX "(products_search_vector_idx|\w+_trgm_idx)"/i,
    reason:
      "This index backs catalogue or inquiry search. Dropping it silently makes search slow or wrong. Delete the line unless the index is genuinely being replaced.",
  },
];

function migrationFiles(): string[] {
  let entries: string[];

  try {
    entries = readdirSync(MIGRATIONS_DIR);
  } catch {
    return [];
  }

  return entries
    .filter((entry) => statSync(path.join(MIGRATIONS_DIR, entry)).isDirectory())
    .map((entry) => path.join(MIGRATIONS_DIR, entry, "migration.sql"))
    .filter((file) => {
      try {
        statSync(file);
        return true;
      } catch {
        return false;
      }
    });
}

function main(): void {
  const problems: Problem[] = [];

  for (const file of migrationFiles()) {
    const lines = readFileSync(file, "utf8").split(/\r?\n/);

    lines.forEach((text, index) => {
      for (const rule of forbidden) {
        if (rule.pattern.test(text)) {
          problems.push({
            file: path.relative(process.cwd(), file),
            line: index + 1,
            text: text.trim(),
            reason: rule.reason,
          });
        }
      }
    });
  }

  if (problems.length === 0) {
    console.log("Migration check passed. No statement that would break the database.");
    return;
  }

  console.error(
    `Migration check failed. ${problems.length} ${
      problems.length === 1 ? "statement" : "statements"
    } would break the database.\n`,
  );

  for (const problem of problems) {
    console.error(`  ${problem.file}:${problem.line}`);
    console.error(`    ${problem.text}`);
    console.error(`    ${problem.reason}\n`);
  }

  process.exit(1);
}

main();
