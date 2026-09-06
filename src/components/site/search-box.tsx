"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";
import { ArrowRight, Search } from "lucide-react";

import { cn } from "@/lib/cn";
import type { SearchSuggestion } from "@/server/repositories/catalogue";

/**
 * The search box, answering as it is typed.
 *
 * It is still a real form posting to the results page, so it works with
 * scripting off and Enter always does what Enter does. With scripting on, a
 * pause in typing fetches the first six matches and the categories whose
 * names contain the term, and shows them under the box with their
 * photographs and codes.
 *
 * It is a combobox in the accessibility sense as well as the visual one: the
 * list is announced, the arrow keys move a highlight through it, Enter opens
 * the highlighted result and Escape closes the list. Nothing here depends on a
 * pointer.
 */
export function SearchBox({ className }: { className?: string }) {
  const router = useRouter();
  const listId = useId();

  const [term, setTerm] = useState("");
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(-1);
  const [result, setResult] = useState<SearchSuggestion>({ products: [], categories: [] });
  const [busy, setBusy] = useState(false);

  const boxRef = useRef<HTMLFormElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const latest = useRef(0);

  // One fetch per pause in typing, and only the newest answer is kept. A slow
  // reply to an earlier keystroke must never overwrite a faster one. The busy
  // flag is raised in the change handler rather than here, so this effect
  // touches state only from inside its own callback.
  useEffect(() => {
    const query = term.trim();
    if (query.length < 2) return;

    const stamp = ++latest.current;

    const timer = setTimeout(async () => {
      try {
        const response = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
        const data = (await response.json()) as SearchSuggestion;
        if (stamp === latest.current) {
          setResult(data);
          setHighlight(-1);
        }
      } catch {
        // A failed suggestion is not an error the person needs to see. The box
        // still submits.
      } finally {
        if (stamp === latest.current) setBusy(false);
      }
    }, 180);

    return () => clearTimeout(timer);
  }, [term]);

  // Anywhere outside closes the list.
  useEffect(() => {
    if (!open) return;

    const onPointerDown = (event: PointerEvent) => {
      if (!boxRef.current?.contains(event.target as Node)) setOpen(false);
    };

    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [open]);

  const options = [
    ...result.categories.map((category) => ({
      kind: "category" as const,
      key: `category:${category.slug}`,
      href: `/products?category=${category.slug}`,
      label: category.name,
      detail: `${category.count} ${category.count === 1 ? "product" : "products"}`,
      image: null as string | null,
    })),
    ...result.products.map((product) => ({
      kind: "product" as const,
      key: `product:${product.id}`,
      href: `/products/${product.slug}`,
      label: product.name,
      detail: `${product.code}, ${product.category}`,
      image: product.image,
    })),
  ];

  const showList = open && term.trim().length >= 2;

  const go = (href: string) => {
    setOpen(false);
    router.push(href);
  };

  const onKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (!showList || options.length === 0) {
      if (event.key === "Escape") setOpen(false);
      return;
    }

    if (event.key === "ArrowDown") {
      event.preventDefault();
      setHighlight((current) => (current + 1) % options.length);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setHighlight((current) => (current <= 0 ? options.length - 1 : current - 1));
    } else if (event.key === "Enter" && highlight >= 0) {
      event.preventDefault();
      go(options[highlight].href);
    } else if (event.key === "Escape") {
      setOpen(false);
      setHighlight(-1);
    }
  };

  return (
    <form
      ref={boxRef}
      action="/products"
      role="search"
      className={cn("relative hidden md:block", className)}
      onSubmit={() => setOpen(false)}
    >
      <label htmlFor="header-search" className="sr-only">
        Search products
      </label>

      <div className="relative">
        <Search
          className="pointer-events-none absolute left-2.5 top-1/2 size-4 shrink-0 -translate-y-1/2 text-ink-muted"
          aria-hidden="true"
        />
        <input
          ref={inputRef}
          id="header-search"
          name="q"
          type="search"
          autoComplete="off"
          placeholder="Search products"
          value={term}
          onChange={(event) => {
            const next = event.target.value;
            setTerm(next);
            setOpen(true);

            if (next.trim().length < 2) {
              setResult({ products: [], categories: [] });
              setBusy(false);
            } else {
              setBusy(true);
            }
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKeyDown}
          role="combobox"
          aria-expanded={showList}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={
            showList && highlight >= 0 ? `${listId}-${highlight}` : undefined
          }
          className={cn(
            "h-9 w-44 border border-line-strong bg-surface-raised pl-8 pr-3 text-sm",
            "transition-[width,border-color,box-shadow] duration-[--duration-settled] ease-[--ease-quiet]",
            "placeholder:text-ink-muted hover:border-ink-muted",
            "focus:w-72 focus:border-brand focus:shadow-[0_0_0_3px_var(--color-brand-wash)] focus:outline-none",
          )}
        />
      </div>

      {/* The list. Drawn as a sheet under the box, in the same square language
          as everything else, with the photograph of each product beside it. */}
      <div
        className={cn(
          "absolute right-0 top-[calc(100%+0.5rem)] z-40 w-[26rem] origin-top-right border border-line bg-surface-raised shadow-overlay",
          "transition-[opacity,transform] duration-[--duration-settled] ease-[--ease-quiet]",
          showList
            ? "pointer-events-auto translate-y-0 opacity-100"
            : "pointer-events-none -translate-y-1 opacity-0",
        )}
        inert={!showList}
      >
        <ul id={listId} role="listbox" aria-label="Suggestions" className="max-h-[28rem] overflow-y-auto py-1.5">
          {options.length === 0 ? (
            <li className="px-4 py-3 text-[0.875rem] text-ink-muted" role="presentation">
              {busy ? "Looking" : `Nothing in the catalogue matches ${term.trim()}. Press Enter to search anyway.`}
            </li>
          ) : null}

          {options.map((option, index) => (
            <li
              key={option.key}
              id={`${listId}-${index}`}
              role="option"
              aria-selected={index === highlight}
              onMouseEnter={() => setHighlight(index)}
              onMouseDown={(event) => {
                // Mouse down rather than click, so the box does not blur and
                // close the list before the click lands.
                event.preventDefault();
                go(option.href);
              }}
              className={cn(
                "flex cursor-pointer items-center gap-3 px-3 py-2 transition-colors duration-[--duration-instant]",
                index === highlight ? "bg-brand-wash" : "hover:bg-surface-sunken",
              )}
            >
              {option.kind === "product" ? (
                <span className="relative size-11 shrink-0 overflow-hidden border border-line bg-surface-sunken">
                  {option.image ? (
                    <Image src={option.image} alt="" fill sizes="2.75rem" className="object-cover" />
                  ) : null}
                </span>
              ) : (
                <span className="note flex size-11 shrink-0 items-center justify-center border border-line bg-surface-sunken text-brand">
                  All
                </span>
              )}

              <span className="min-w-0 flex-1">
                <span className="block truncate text-[0.9375rem] text-ink">{option.label}</span>
                <span className="note block truncate">{option.detail}</span>
              </span>

              <ArrowRight
                className={cn(
                  "size-4 shrink-0 text-ink-muted transition-[transform,opacity] duration-[--duration-quick]",
                  index === highlight ? "translate-x-0 opacity-100" : "-translate-x-1 opacity-0",
                )}
                aria-hidden="true"
              />
            </li>
          ))}
        </ul>

        {options.length > 0 ? (
          <button
            type="submit"
            className="note flex w-full items-center justify-between border-t border-line px-4 py-3 text-ink-soft transition-colors hover:bg-surface-sunken hover:text-ink"
          >
            Every result for {term.trim()}
            <ArrowRight className="size-3.5" aria-hidden="true" />
          </button>
        ) : null}
      </div>
    </form>
  );
}
