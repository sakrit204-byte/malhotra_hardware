import "server-only";

import { createHash, randomBytes } from "node:crypto";

import { cookies } from "next/headers";
import { cache } from "react";

import type { Role } from "@/generated/prisma/enums";
import { prisma } from "@/server/db/prisma";
import { env } from "@/server/env";

/**
 * Sessions.
 *
 * The browser holds a random opaque token. The database holds only its hash, so
 * a leaked database does not hand anyone a working session. Nothing about the
 * user, including their role, is carried in the cookie: every request reads the
 * current row, so disabling an account or changing a role takes effect on the
 * next request rather than whenever a signed token happens to expire.
 */

export const SESSION_COOKIE = "me_session";
const SESSION_DAYS = 30;
const TOUCH_AFTER_MS = 60 * 60 * 1000;

export type SessionUser = {
  id: string;
  email: string;
  fullName: string;
  role: Role;
  emailVerified: boolean;
};

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export async function createSession(
  userId: string,
  context: { ipAddress?: string | null; userAgent?: string | null } = {},
): Promise<void> {
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000);

  await prisma.session.create({
    data: {
      userId,
      tokenHash: hashToken(token),
      expiresAt,
      ipAddress: context.ipAddress ?? null,
      userAgent: context.userAgent?.slice(0, 400) ?? null,
    },
  });

  const store = await cookies();

  store.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: env.NODE_ENV === "production",
    path: "/",
    expires: expiresAt,
  });
}

/**
 * The signed in user, or null.
 *
 * Wrapped in cache so that a page which asks several times during one render
 * costs one query. A disabled or soft deleted account resolves to null, which
 * means an administrator can lock someone out immediately.
 */
export const getSession = cache(async (): Promise<SessionUser | null> => {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;

  if (!token) return null;

  const session = await prisma.session.findUnique({
    where: { tokenHash: hashToken(token) },
    select: {
      id: true,
      expiresAt: true,
      lastUsedAt: true,
      user: {
        select: {
          id: true,
          email: true,
          fullName: true,
          role: true,
          isActive: true,
          deletedAt: true,
          emailVerifiedAt: true,
        },
      },
    },
  });

  if (!session) return null;

  if (session.expiresAt.getTime() < Date.now()) {
    // Tidy up as we go rather than relying on a scheduled sweep.
    await prisma.session.delete({ where: { id: session.id } }).catch(() => undefined);
    return null;
  }

  const { user } = session;

  if (!user.isActive || user.deletedAt) return null;

  // Record activity at most once an hour, so reading a page does not turn into
  // a write on every request.
  if (Date.now() - session.lastUsedAt.getTime() > TOUCH_AFTER_MS) {
    await prisma.session
      .update({ where: { id: session.id }, data: { lastUsedAt: new Date() } })
      .catch(() => undefined);
  }

  return {
    id: user.id,
    email: user.email,
    fullName: user.fullName,
    role: user.role,
    emailVerified: Boolean(user.emailVerifiedAt),
  };
});

export async function destroySession(): Promise<void> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;

  if (token) {
    await prisma.session
      .deleteMany({ where: { tokenHash: hashToken(token) } })
      .catch(() => undefined);
  }

  store.delete(SESSION_COOKIE);
}

/** Ends every session for a user, used after a password change. */
export async function destroyAllSessions(userId: string): Promise<void> {
  await prisma.session.deleteMany({ where: { userId } });
}
