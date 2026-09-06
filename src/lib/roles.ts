/**
 * Role policy.
 *
 * Pure and free of framework imports, so it can be reasoned about and tested on
 * its own. The guards in server/auth wrap it with the redirects that belong to
 * a page; this file only answers whether somebody is allowed.
 *
 * Roles are ordered: an administrator can do everything a manager can. Nothing
 * runs the other way, so a manager can never reach an administrator operation.
 */

export type RoleName = "USER" | "MANAGER" | "ADMIN";

const RANK: Record<RoleName, number> = { USER: 0, MANAGER: 1, ADMIN: 2 };

export function hasRole(
  user: { role: RoleName } | null | undefined,
  minimum: RoleName,
): boolean {
  if (!user) return false;
  return RANK[user.role] >= RANK[minimum];
}
