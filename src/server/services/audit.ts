import "server-only";

import { prisma } from "@/server/db/prisma";
import type { SessionUser } from "@/server/auth/session";

/**
 * The record of who changed what.
 *
 * Writing an audit entry must never be the reason an operation fails, so every
 * call swallows its own errors and reports them to the log instead. A missing
 * audit row is a gap in the history; a failed product save because of one would
 * be a broken product.
 */
export async function recordAudit(input: {
  actor: SessionUser;
  action: string;
  entityType: string;
  entityId?: string | null;
  summary: string;
  before?: unknown;
  after?: unknown;
  ipAddress?: string | null;
}): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        actor: { connect: { id: input.actor.id } },
        actorEmail: input.actor.email,
        actorRole: input.actor.role,
        action: input.action,
        entityType: input.entityType,
        entityId: input.entityId ?? null,
        summary: input.summary,
        before: input.before === undefined ? undefined : JSON.parse(JSON.stringify(input.before)),
        after: input.after === undefined ? undefined : JSON.parse(JSON.stringify(input.after)),
        ipAddress: input.ipAddress ?? null,
      },
    });
  } catch (error) {
    console.error(`Could not record the audit entry for ${input.action}`, error);
  }
}
