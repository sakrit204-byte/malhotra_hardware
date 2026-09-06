import { headers } from "next/headers";
import { NextResponse } from "next/server";

import { env } from "@/server/env";
import { clientAddress } from "@/server/rate-limit";
import { verifyEmail } from "@/server/services/auth";

/**
 * The confirmation link from the welcome email.
 *
 * This is a route handler rather than a page because it changes things: it
 * consumes the token, marks the address confirmed, attaches any guest inquiries
 * and signs the customer in. A page renders, and a render may not set a session
 * cookie. A handler may, so this is where that work belongs.
 *
 * It always redirects afterwards, which also means a refresh cannot try to
 * consume an already consumed token and show a confusing failure.
 */
export async function GET(request: Request) {
  const token = new URL(request.url).searchParams.get("token") ?? "";
  const requestHeaders = await headers();
  const address = clientAddress(requestHeaders);

  const base = env.APP_URL;

  if (!token) {
    return NextResponse.redirect(new URL("/verify/problem", base));
  }

  const result = await verifyEmail(token, {
    ipAddress: address === "unknown" ? null : address,
    userAgent: requestHeaders.get("user-agent"),
  });

  if (!result.ok) {
    return NextResponse.redirect(new URL("/verify/problem", base));
  }

  const done = new URL("/verify/done", base);
  if (result.claimed > 0) done.searchParams.set("claimed", String(result.claimed));
  if (result.alreadyVerified) done.searchParams.set("already", "1");

  return NextResponse.redirect(done);
}
