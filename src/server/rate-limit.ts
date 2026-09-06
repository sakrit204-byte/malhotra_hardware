import "server-only";

import { randomUUID } from "node:crypto";

import { prisma } from "@/server/db/prisma";

/**
 * Rate limiting, counted in PostgreSQL.
 *
 * Keeping the counter in the database rather than in process memory means the
 * limit still holds when the application runs as more than one instance, and
 * means there is no Redis to operate. The increment is a single upsert, so two
 * requests arriving at the same moment cannot both read the old value.
 *
 * Windows are fixed rather than sliding. A fixed window can allow a short burst
 * across a boundary, which is an acceptable trade for how simple and cheap it
 * is to reason about here.
 */

export type RateLimitResult = {
  allowed: boolean;
  remaining: number;
  /** Seconds until the current window closes. */
  retryAfter: number;
};

export type RateLimitRule = {
  /** Identifies the thing being limited, for example an address or an email. */
  key: string;
  limit: number;
  windowSeconds: number;
};

export async function checkRateLimit(rule: RateLimitRule): Promise<RateLimitResult> {
  const now = Date.now();
  const windowMs = rule.windowSeconds * 1000;
  const windowStart = new Date(Math.floor(now / windowMs) * windowMs);
  const expiresAt = new Date(windowStart.getTime() + windowMs);

  try {
    const rows = await prisma.$queryRaw<Array<{ hits: number }>>`
      INSERT INTO rate_limits (id, "bucketKey", "windowStart", hits, "expiresAt")
      VALUES (${randomUUID()}, ${rule.key}, ${windowStart}, 1, ${expiresAt})
      ON CONFLICT ("bucketKey", "windowStart")
      DO UPDATE SET hits = rate_limits.hits + 1
      RETURNING hits
    `;

    const hits = rows[0]?.hits ?? 1;

    // Sweep expired rows occasionally rather than on a schedule. The table only
    // ever holds one row per key per window, so this stays cheap.
    if (Math.random() < 0.02) {
      await prisma.rateLimit
        .deleteMany({ where: { expiresAt: { lt: new Date(now) } } })
        .catch(() => undefined);
    }

    return {
      allowed: hits <= rule.limit,
      remaining: Math.max(0, rule.limit - hits),
      retryAfter: Math.ceil((expiresAt.getTime() - now) / 1000),
    };
  } catch (error) {
    // A limiter that cannot reach the database must not take the feature down
    // with it. Fail open, and make sure the failure is visible in the log.
    console.error("Rate limit check failed, allowing the request", error);
    return { allowed: true, remaining: 0, retryAfter: 0 };
  }
}

/** Combines several limits, returning the first that has been exceeded. */
export async function checkRateLimits(
  rules: RateLimitRule[],
): Promise<RateLimitResult> {
  const results = await Promise.all(rules.map(checkRateLimit));
  const blocked = results.find((result) => !result.allowed);

  return blocked ?? { allowed: true, remaining: 0, retryAfter: 0 };
}

/**
 * Best effort client address. Behind a proxy the first entry of the forwarded
 * header is the client; without one there is nothing to read, so the caller
 * falls back to a shared bucket rather than skipping the limit entirely.
 */
export function clientAddress(headers: Headers): string {
  const forwarded = headers.get("x-forwarded-for");

  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first;
  }

  return headers.get("x-real-ip")?.trim() || "unknown";
}
