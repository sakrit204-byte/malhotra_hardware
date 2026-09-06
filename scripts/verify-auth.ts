/**
 * Checks the security properties the account system depends on.
 *
 * These are the things that are quiet when they break: a token that still works
 * after being used, a redirect that will follow somebody off the site, a role
 * check that lets a manager through an administrator door. None of them show up
 * as a broken page, so they are exercised rather than assumed.
 *
 * Run with: npm run verify:auth
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
  console.log(`  ${passed ? "pass" : "FAIL"}  ${description}${detail ? ` (${detail})` : ""}`);
}

async function testPasswords() {
  console.log("\nPasswords");

  const { hashPassword, verifyPassword, needsRehash } = await import(
    "../src/server/auth/password"
  );

  const password = "a phrase nobody else would pick";
  const hash = await hashPassword(password);

  check("a hash is stored in the standard format", hash.startsWith("$argon2id$v=19$"));
  check("the same password verifies", await verifyPassword(password, hash));
  check("a different password does not", !(await verifyPassword(password + "x", hash)));
  check(
    "a malformed hash is refused rather than throwing",
    !(await verifyPassword(password, "not a hash at all")),
  );

  const second = await hashPassword(password);
  check("two hashes of the same password differ, so the salt is random", hash !== second);
  check("a current hash does not ask to be rebuilt", !needsRehash(hash));
  check(
    "a weaker hash is flagged for rebuilding",
    needsRehash("$argon2id$v=19$m=4096,t=1,p=1$c2FsdA$aGFzaA"),
  );
}

async function testTokens() {
  console.log("\nSingle use tokens");

  const { issueToken, findValidToken, consumeToken } = await import(
    "../src/server/auth/tokens"
  );

  const email = `token.check.${Date.now()}@example.com`;
  const issued = await issueToken({
    type: "EMAIL_VERIFICATION",
    email,
    lifetimeSeconds: 600,
  });

  const stored = await prisma.verificationToken.findFirst({
    where: { email },
    select: { id: true, tokenHash: true },
  });

  check("only a hash of the token is stored", stored?.tokenHash !== issued.token);

  const found = await findValidToken(issued.token, "EMAIL_VERIFICATION");
  check("a fresh token is accepted", found !== null);

  check(
    "the same token is refused for a different purpose",
    (await findValidToken(issued.token, "PASSWORD_RESET")) === null,
  );

  if (found) await consumeToken(found.id);

  check(
    "a consumed token never works again",
    (await findValidToken(issued.token, "EMAIL_VERIFICATION")) === null,
  );

  // An expired token, written directly so the check does not have to wait.
  const expired = await issueToken({
    type: "PASSWORD_RESET",
    email,
    lifetimeSeconds: 60,
  });

  await prisma.verificationToken.updateMany({
    where: { email, type: "PASSWORD_RESET" },
    data: { expiresAt: new Date(Date.now() - 1000) },
  });

  check(
    "an expired token is refused",
    (await findValidToken(expired.token, "PASSWORD_RESET")) === null,
  );

  check("nonsense is refused", (await findValidToken("short", "PASSWORD_RESET")) === null);

  await prisma.verificationToken.deleteMany({ where: { email } });
}

async function testRedirects() {
  console.log("\nRedirect targets");

  const { safeRedirect } = await import("../src/server/validation/auth");

  const refused = [
    "https://example.com/phish",
    "//example.com/phish",
    "http://localhost:3000/account",
    "javascript:alert(1)",
    "/\\example.com",
  ];

  for (const value of refused) {
    check(
      `refuses ${value}`,
      safeRedirect(value) === "/account/inquiries",
      safeRedirect(value),
    );
  }

  check("keeps a path within the site", safeRedirect("/inquiry") === "/inquiry");
  check(
    "keeps a path with a query string",
    safeRedirect("/products?category=door-locks") === "/products?category=door-locks",
  );
}

async function testRoles() {
  console.log("\nRoles");

  const { hasRole } = await import("../src/lib/roles");

  const user = { role: "USER" as const };
  const manager = { role: "MANAGER" as const };
  const admin = { role: "ADMIN" as const };

  check("a customer is not a manager", !hasRole(user, "MANAGER"));
  check("a customer is not an administrator", !hasRole(user, "ADMIN"));
  check("a manager is a manager", hasRole(manager, "MANAGER"));
  check("a manager is not an administrator", !hasRole(manager, "ADMIN"));
  check("an administrator is also a manager", hasRole(admin, "MANAGER"));
  check("nobody signed in is nobody", !hasRole(null, "USER"));
}

async function testStoredAccounts() {
  console.log("\nStored accounts");

  const users = await prisma.user.findMany({
    select: { email: true, passwordHash: true, role: true },
  });

  check(
    "every account has a hashed password, never a readable one",
    users.every((user) => user.passwordHash.startsWith("$argon2id$")),
    `${users.length} accounts`,
  );

  check(
    "every address is stored in lower case",
    users.every((user) => user.email === user.email.toLowerCase()),
  );

  const duplicates = new Set(users.map((user) => user.email.toLowerCase()));
  check("no two accounts share an address", duplicates.size === users.length);

  const orphanSessions = await prisma.session.count({
    where: { expiresAt: { lt: new Date() } },
  });

  console.log(
    `  note  ${orphanSessions} expired ${
      orphanSessions === 1 ? "session is" : "sessions are"
    } waiting to be swept, which is harmless`,
  );
}

async function main() {
  console.log("Verifying account security properties");

  await testPasswords();
  await testTokens();
  await testRedirects();
  await testRoles();
  await testStoredAccounts();

  console.log(
    failures === 0
      ? "\nAll account invariants hold."
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
