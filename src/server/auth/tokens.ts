import "server-only";

import { createHash, randomBytes, timingSafeEqual } from "node:crypto";

import { prisma } from "@/server/db/prisma";
import type { TokenType } from "@/generated/prisma/enums";

/**
 * Single use tokens for email verification, password reset and guest access to
 * an inquiry.
 *
 * Only a hash of each token is stored. A leaked database backup therefore does
 * not hand anyone a working link, in the same way that storing password hashes
 * does not hand anyone a working password.
 */

const TOKEN_BYTES = 32;

export type IssuedToken = {
  /** The value that goes in the link. Never stored, never logged. */
  token: string;
  expiresAt: Date;
};

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export async function issueToken(input: {
  type: TokenType;
  email: string;
  userId?: string | null;
  inquiryId?: string | null;
  lifetimeSeconds: number;
}): Promise<IssuedToken> {
  const token = randomBytes(TOKEN_BYTES).toString("base64url");
  const expiresAt = new Date(Date.now() + input.lifetimeSeconds * 1000);

  await prisma.verificationToken.create({
    data: {
      type: input.type,
      email: input.email.toLowerCase(),
      userId: input.userId ?? null,
      inquiryId: input.inquiryId ?? null,
      tokenHash: hashToken(token),
      expiresAt,
    },
  });

  return { token, expiresAt };
}

export type TokenLookup = {
  id: string;
  email: string;
  userId: string | null;
  inquiryId: string | null;
};

/**
 * Finds a token that is the right type, has not expired and has not been used.
 * Returns null for anything else, so a caller cannot accidentally accept a
 * consumed or expired token by forgetting a check.
 */
export async function findValidToken(
  token: string,
  type: TokenType,
): Promise<TokenLookup | null> {
  if (!token || token.length < 20 || token.length > 200) return null;

  const record = await prisma.verificationToken.findUnique({
    where: { tokenHash: hashToken(token) },
    select: {
      id: true,
      type: true,
      email: true,
      userId: true,
      inquiryId: true,
      expiresAt: true,
      consumedAt: true,
      tokenHash: true,
    },
  });

  if (!record) return null;
  if (record.type !== type) return null;
  if (record.consumedAt) return null;
  if (record.expiresAt.getTime() < Date.now()) return null;

  // The lookup above already matched on a hash, so this is belt and braces
  // against a future change that widens the query.
  const expected = Buffer.from(record.tokenHash);
  const actual = Buffer.from(hashToken(token));
  if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) {
    return null;
  }

  return {
    id: record.id,
    email: record.email,
    userId: record.userId,
    inquiryId: record.inquiryId,
  };
}

/** Marks a token used. Verification and reset tokens must never work twice. */
export async function consumeToken(id: string): Promise<void> {
  await prisma.verificationToken.updateMany({
    where: { id, consumedAt: null },
    data: { consumedAt: new Date() },
  });
}

/** Removes expired tokens. Safe to call from a scheduled job. */
export async function purgeExpiredTokens(): Promise<number> {
  const result = await prisma.verificationToken.deleteMany({
    where: { expiresAt: { lt: new Date() } },
  });

  return result.count;
}
