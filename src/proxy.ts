import { NextResponse, type NextRequest } from "next/server";

/**
 * A first gate in front of the private areas.
 *
 * Next calls this file a proxy now; it was called middleware until recently.
 * The job is the same.
 *
 * Middleware runs before the request reaches a page, but it cannot reach the
 * database, so it can only see whether a session cookie is present. That is
 * enough to send an anonymous visitor to the sign in page with the address they
 * were trying to reach, which saves rendering a page nobody may see.
 *
 * It is not the check that matters. A cookie can be forged, so every private
 * page and every action verifies the session against the database and confirms
 * the role before doing anything. This only spares us the round trip.
 */

const SESSION_COOKIE = "me_session";

const PROTECTED_PREFIXES = ["/account", "/manager", "/admin"];

export default function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  const isProtected = PROTECTED_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );

  if (!isProtected) return NextResponse.next();

  if (request.cookies.has(SESSION_COOKIE)) return NextResponse.next();

  const signIn = new URL("/login", request.url);
  signIn.searchParams.set("next", `${pathname}${search}`);

  return NextResponse.redirect(signIn);
}

export const config = {
  // Everything except framework internals and files served from disk.
  matcher: ["/((?!_next/static|_next/image|uploads|favicon.ico|robots.txt|sitemap.xml).*)"],
};
