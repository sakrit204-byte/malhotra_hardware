import "server-only";

import { redirect } from "next/navigation";

import type { Role } from "@/generated/prisma/enums";
import { hasRole } from "@/lib/roles";
import { getSession, type SessionUser } from "@/server/auth/session";

/**
 * The checks every private page and action runs.
 *
 * Middleware only looks for a cookie. These read the session out of the
 * database, confirm the account is still active and confirm the role, which is
 * why they are what actually protects anything.
 *
 * The ordering itself lives in lib/roles, which has no framework imports and
 * can therefore be checked on its own.
 */

export { hasRole };

/** Requires somebody signed in, and sends them to sign in if they are not. */
export async function requireUser(returnTo?: string): Promise<SessionUser> {
  const session = await getSession();

  if (!session) {
    redirect(returnTo ? `/login?next=${encodeURIComponent(returnTo)}` : "/login");
  }

  return session;
}

/**
 * Requires at least the given role.
 *
 * Somebody signed in without the role is sent to a not found page rather than a
 * refusal, so the existence of the manager and administrator platforms is not
 * advertised to an ordinary customer who guesses at an address.
 */
export async function requireRole(
  minimum: Role,
  returnTo?: string,
): Promise<SessionUser> {
  const session = await requireUser(returnTo);

  if (!hasRole(session, minimum)) {
    redirect("/");
  }

  return session;
}

/** For actions, which answer rather than redirect. */
export async function currentUserOrNull(): Promise<SessionUser | null> {
  return getSession();
}
