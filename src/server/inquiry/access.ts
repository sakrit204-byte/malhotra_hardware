import "server-only";

import { cookies } from "next/headers";

import { RECEIPT_COOKIE } from "@/server/inquiry/receipt";
import { getSession } from "@/server/auth/session";
import { findValidToken } from "@/server/auth/tokens";
import { prisma } from "@/server/db/prisma";

/**
 * Who is allowed to see an inquiry.
 *
 * There are exactly four ways in, and this is the only place that decides.
 * Every page, route handler and action that touches a single inquiry asks here
 * rather than writing its own check, so there is one rule to review and one
 * place to change it.
 *
 * 1. **Staff.** A manager or an administrator can open any inquiry.
 * 2. **The account it belongs to.** A signed in customer can open an inquiry
 *    whose `userId` is theirs. Matching on the email address is deliberately
 *    not enough, because anyone can type an address into the guest form.
 * 3. **The receipt cookie.** Set when the inquiry was created, so the guest who
 *    just sent it can read the confirmation and download the summary.
 * 4. **An access token.** The signed link emailed to a guest, which is bound to
 *    that one inquiry and expires.
 *
 * Anything else is refused, including a signed in customer whose address
 * happens to match a guest inquiry they did not file.
 */

export type AccessGrant =
  | { allowed: true; via: "staff" | "account" | "receipt" | "token"; isStaff: boolean }
  | { allowed: false; via: null; isStaff: false };

const denied: AccessGrant = { allowed: false, via: null, isStaff: false };

export async function authoriseInquiryAccess(
  inquiryId: string,
  options: { token?: string | null } = {},
): Promise<AccessGrant> {
  if (!inquiryId) return denied;

  const session = await getSession();

  if (session && (session.role === "MANAGER" || session.role === "ADMIN")) {
    return { allowed: true, via: "staff", isStaff: true };
  }

  const inquiry = await prisma.inquiry.findUnique({
    where: { id: inquiryId },
    select: { id: true, userId: true },
  });

  if (!inquiry) return denied;

  if (session && inquiry.userId && inquiry.userId === session.id) {
    return { allowed: true, via: "account", isStaff: false };
  }

  const store = await cookies();
  if (store.get(RECEIPT_COOKIE)?.value === inquiry.id) {
    return { allowed: true, via: "receipt", isStaff: false };
  }

  if (options.token) {
    const record = await findValidToken(options.token, "INQUIRY_ACCESS");

    // The token must be for this inquiry. A valid token for a different one
    // grants nothing here.
    if (record?.inquiryId === inquiry.id) {
      return { allowed: true, via: "token", isStaff: false };
    }
  }

  return denied;
}

/**
 * Attaches past guest inquiries to an account, once the address has been proven
 * to belong to that account.
 *
 * Called only after email verification. It never runs on the strength of a
 * typed address alone, because that would let anyone collect the inquiry
 * history of any address they can spell.
 */
export async function claimInquiriesForVerifiedEmail(
  userId: string,
  verifiedEmail: string,
): Promise<number> {
  const result = await prisma.inquiry.updateMany({
    where: { email: verifiedEmail.toLowerCase(), userId: null },
    data: { userId },
  });

  if (result.count > 0) {
    await prisma.auditLog.create({
      data: {
        actorUserId: userId,
        actorEmail: verifiedEmail.toLowerCase(),
        action: "inquiry.claimed",
        entityType: "Inquiry",
        summary: `${result.count} guest ${
          result.count === 1 ? "inquiry" : "inquiries"
        } attached to the account after email verification`,
      },
    });
  }

  return result.count;
}
