import { ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";

import { cn } from "@/lib/cn";
import { pageHref, type CatalogueQuery } from "@/lib/catalogue";

/**
 * Catalogue pagination.
 *
 * Ordinary links, so every page of the catalogue has its own address that can
 * be shared, indexed and reached without JavaScript.
 */
export function Pagination({
  query,
  page,
  pageCount,
}: {
  query: CatalogueQuery;
  page: number;
  pageCount: number;
}) {
  if (pageCount <= 1) return null;

  // Show the ends, the current page and its neighbours. Long catalogues should
  // not produce a hundred links.
  const numbers = new Set<number>([1, pageCount, page - 1, page, page + 1]);
  const pages = Array.from(numbers)
    .filter((value) => value >= 1 && value <= pageCount)
    .sort((a, b) => a - b);

  return (
    <nav aria-label="Catalogue pages" className="mt-12 flex items-center justify-center gap-1">
      {page > 1 ? (
        <Link
          href={pageHref(query, page - 1)}
          rel="prev"
          className="inline-flex h-10 items-center gap-1 px-3 text-sm text-ink-soft transition-colors hover:text-brand"
        >
          <ChevronLeft className="size-4" aria-hidden="true" />
          Previous
        </Link>
      ) : null}

      <ul className="flex items-center gap-1">
        {pages.map((value, index) => {
          const previous = pages[index - 1];
          const gap = previous !== undefined && value - previous > 1;

          return (
            <li key={value} className="flex items-center gap-1">
              {gap ? (
                <span className="px-1 text-ink-muted" aria-hidden="true">
                  &hellip;
                </span>
              ) : null}
              <Link
                href={pageHref(query, value)}
                aria-current={value === page ? "page" : undefined}
                className={cn(
                  "figure inline-flex size-10 items-center justify-center border transition-colors duration-[--duration-quick]",
                  value === page
                    ? "border-brand bg-brand text-white"
                    : "border-transparent text-ink-soft hover:border-line-strong hover:text-ink",
                )}
              >
                {value}
                <span className="sr-only">
                  {value === page ? ", current page" : ` of ${pageCount}`}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>

      {page < pageCount ? (
        <Link
          href={pageHref(query, page + 1)}
          rel="next"
          className="inline-flex h-10 items-center gap-1 px-3 text-sm text-ink-soft transition-colors hover:text-brand"
        >
          Next
          <ChevronRight className="size-4" aria-hidden="true" />
        </Link>
      ) : null}
    </nav>
  );
}
