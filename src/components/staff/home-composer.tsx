"use client";

import Image from "next/image";
import { useActionState, useMemo, useState } from "react";
import { ArrowDown, ArrowUp, Check, Plus, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { emptyAuthState } from "@/lib/auth-form";
import { cn } from "@/lib/cn";
import { saveShowcaseAction } from "@/server/actions/admin-home";

/**
 * What the home page shows, arranged by hand.
 *
 * Three lists, each drawn in the order it will appear on the site: the
 * categories somebody browses first, the piece shown beside the hero, and the
 * row of products underneath. Adding, removing and reordering are all here,
 * which is the whole point: nobody should have to open thirty product editors
 * to change what the front of the shop looks like.
 *
 * Ordering is done with buttons rather than by dragging. A drag is quicker with
 * a mouse and impossible without one, and this list has to be operable from a
 * keyboard like everything else on the platform.
 */

type Choice = {
  value: string;
  label: string;
  note?: string;
  image?: string | null;
};

export function HomeComposer({
  products,
  categories,
  initial,
}: {
  products: Choice[];
  categories: Choice[];
  initial: { featured: string[]; popular: string[]; categories: string[] };
}) {
  const [state, action, pending] = useActionState(saveShowcaseAction, emptyAuthState);

  const [featured, setFeatured] = useState(initial.featured);
  const [popular, setPopular] = useState(initial.popular);
  const [chosenCategories, setChosenCategories] = useState(initial.categories);

  const dirty =
    featured.join() !== initial.featured.join() ||
    popular.join() !== initial.popular.join() ||
    chosenCategories.join() !== initial.categories.join();

  return (
    <form action={action} className="space-y-12">
      <input type="hidden" name="featured" value={featured.join(",")} />
      <input type="hidden" name="popular" value={popular.join(",")} />
      <input type="hidden" name="categories" value={chosenCategories.join(",")} />

      <Picker
        heading="Where to start"
        description="The browse block. The first one is drawn at four times the size of the rest, so put your strongest photograph there."
        limit={5}
        options={categories}
        selected={chosenCategories}
        onChange={setChosenCategories}
        emptyLabel="No category chosen, so the block falls back to whatever is ticked as featured."
      />

      <Picker
        heading="Beside the hero"
        description="The piece of hardware shown in front of the building. The first one with a photograph is used."
        limit={3}
        options={products}
        selected={featured}
        onChange={setFeatured}
        emptyLabel="Nothing chosen, so the hero picks the first featured product it can find."
      />

      <Picker
        heading="What architects come back for"
        description="The row of products on the home page, in the order they appear."
        limit={8}
        options={products}
        selected={popular}
        onChange={setPopular}
        emptyLabel="Nothing chosen, so the row falls back to whatever is ticked as popular."
      />

      <div className="sticky bottom-0 flex flex-wrap items-center gap-4 border-t border-ink bg-surface/95 py-4 backdrop-blur-md">
        <Button type="submit" size="lg" disabled={pending || !dirty}>
          {pending ? "Saving" : dirty ? "Save the arrangement" : "Nothing to save"}
        </Button>

        {state.status === "sent" && state.message ? (
          <p role="status" className="flex items-center gap-2 text-[0.9375rem] text-positive">
            <Check className="size-4" aria-hidden="true" />
            {state.message}
          </p>
        ) : null}

        {state.errors.form ? (
          <p role="alert" className="text-[0.9375rem] text-critical">
            {state.errors.form}
          </p>
        ) : null}
      </div>
    </form>
  );
}

function Picker({
  heading,
  description,
  limit,
  options,
  selected,
  onChange,
  emptyLabel,
}: {
  heading: string;
  description: string;
  limit: number;
  options: Choice[];
  selected: string[];
  onChange: (next: string[]) => void;
  emptyLabel: string;
}) {
  const [search, setSearch] = useState("");

  const byValue = useMemo(
    () => new Map(options.map((option) => [option.value, option])),
    [options],
  );

  const matches = useMemo(() => {
    const term = search.trim().toLowerCase();
    const available = options.filter((option) => !selected.includes(option.value));

    if (!term) return available.slice(0, 8);

    return available
      .filter(
        (option) =>
          option.label.toLowerCase().includes(term) ||
          option.value.toLowerCase().includes(term) ||
          (option.note ?? "").toLowerCase().includes(term),
      )
      .slice(0, 8);
  }, [options, search, selected]);

  const move = (index: number, direction: -1 | 1) => {
    const next = [...selected];
    const target = index + direction;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];
    onChange(next);
  };

  const full = selected.length >= limit;

  return (
    <section className="border-t border-ink pt-3">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <h2 className="note">{heading}</h2>
        <p className="note">
          {selected.length} of {limit}
        </p>
      </div>

      <p className="mt-4 max-w-2xl text-[0.9375rem] text-ink-soft">{description}</p>

      <div className="mt-6 grid gap-8 lg:grid-cols-[1.2fr_1fr]">
        {/* ------------------------------------------------ the arrangement */}
        <div>
          {selected.length === 0 ? (
            <p className="border border-dashed border-line-strong p-4 text-[0.875rem] text-ink-muted">
              {emptyLabel}
            </p>
          ) : (
            <ol className="divide-y divide-line border-y border-line">
              {selected.map((value, index) => {
                const option = byValue.get(value);

                return (
                  <li key={value} className="flex items-center gap-3 py-2.5">
                    <span className="note w-6 shrink-0">
                      {String(index + 1).padStart(2, "0")}
                    </span>

                    <span className="relative size-11 shrink-0 overflow-hidden border border-line bg-surface-sunken">
                      {option?.image ? (
                        <Image
                          src={option.image}
                          alt=""
                          fill
                          sizes="2.75rem"
                          className="object-cover"
                        />
                      ) : null}
                    </span>

                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[0.9375rem] text-ink">
                        {option?.label ?? value}
                      </span>
                      <span className="note block truncate">
                        {option ? (option.note ?? value) : "No longer in the catalogue"}
                      </span>
                    </span>

                    <span className="flex shrink-0 gap-1">
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        disabled={index === 0}
                        onClick={() => move(index, -1)}
                      >
                        <ArrowUp className="size-3.5" aria-hidden="true" />
                        <span className="sr-only">Move {option?.label ?? value} up</span>
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        disabled={index === selected.length - 1}
                        onClick={() => move(index, 1)}
                      >
                        <ArrowDown className="size-3.5" aria-hidden="true" />
                        <span className="sr-only">Move {option?.label ?? value} down</span>
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        className="text-critical hover:text-critical"
                        onClick={() =>
                          onChange(selected.filter((entry) => entry !== value))
                        }
                      >
                        <X className="size-3.5" aria-hidden="true" />
                        <span className="sr-only">Remove {option?.label ?? value}</span>
                      </Button>
                    </span>
                  </li>
                );
              })}
            </ol>
          )}
        </div>

        {/* ------------------------------------------------------ the choices */}
        <div className="bg-surface-sunken p-4">
          <label className="note block" htmlFor={`search-${heading}`}>
            Add to this list
          </label>
          <input
            id={`search-${heading}`}
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search by name or code"
            disabled={full}
            className="mt-2 h-10 w-full border border-line-strong bg-surface px-3 text-[0.9375rem] disabled:cursor-not-allowed disabled:text-ink-muted"
          />

          {full ? (
            <p className="mt-3 text-[0.875rem] text-ink-muted">
              That is as many as this block shows. Remove one to add another.
            </p>
          ) : matches.length === 0 ? (
            <p className="mt-3 text-[0.875rem] text-ink-muted">
              Nothing matches that. Only published products can be shown on the home page.
            </p>
          ) : (
            <ul className="mt-3 divide-y divide-line border-t border-line">
              {matches.map((option) => (
                <li key={option.value}>
                  <button
                    type="button"
                    onClick={() => onChange([...selected, option.value])}
                    className={cn(
                      "flex w-full items-center gap-3 py-2 text-left transition-colors",
                      "hover:bg-surface-raised",
                    )}
                  >
                    <Plus className="size-3.5 shrink-0 text-ink-muted" aria-hidden="true" />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[0.9375rem] text-ink">
                        {option.label}
                      </span>
                      {option.note ? (
                        <span className="note block truncate">{option.note}</span>
                      ) : null}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </section>
  );
}
