import { NextResponse } from "next/server";

import { searchSuggestions } from "@/server/repositories/catalogue";

/**
 * Suggestions for the search box.
 *
 * A GET with the term in the query string, answered as JSON, so the box can
 * ask on every pause in typing. The results are public catalogue data and
 * are cached briefly at the edge, because the same few terms are typed over
 * and over and the catalogue does not change between keystrokes.
 */
export async function GET(request: Request) {
  const term = new URL(request.url).searchParams.get("q") ?? "";
  const suggestions = await searchSuggestions(term);

  return NextResponse.json(suggestions, {
    headers: { "cache-control": "public, max-age=30, stale-while-revalidate=120" },
  });
}
