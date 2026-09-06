"use client";

import Image from "next/image";
import { useActionState, useRef, useState } from "react";
import { Check, Crosshair, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Field, Input, Textarea } from "@/components/ui/field";
import { emptyAuthState } from "@/lib/auth-form";
import { cn } from "@/lib/cn";
import { saveHeroAction, saveHotspotsAction } from "@/server/actions/admin-home";

/**
 * The hero, edited where it can be seen.
 *
 * The words are a plain form. The photograph is chosen from the pictures that
 * are actually on the server. And the points marked on it are placed by
 * pressing the picture, which is the part that used to require writing
 * coordinates into a JSON file by hand.
 *
 * Placement is keyboard operable as well: each point can be nudged with the
 * arrow keys once it has focus, in one per cent steps, and the coordinates are
 * announced as text beside the picture so nobody has to see the marker to know
 * where it is.
 */

type Hotspot = { x: number; y: number; code: string; label: string };

export function HeroEditor({
  hero,
  images,
  products,
}: {
  hero: {
    eyebrow: string;
    headline: string;
    body: string;
    primaryLabel: string;
    primaryHref: string;
    secondaryLabel: string;
    secondaryHref: string;
    image: string;
    hotspots: Hotspot[];
  };
  images: Array<{ key: string; url: string; credit: string | null }>;
  products: Array<{ code: string; name: string }>;
}) {
  const [state, action, pending] = useActionState(saveHeroAction, emptyAuthState);
  const [image, setImage] = useState(hero.image);

  const value = (field: keyof typeof hero, fallback: string) =>
    (state.values[field] as string | undefined) ?? fallback;

  const chosen = images.find((entry) => entry.key === image);

  return (
    <div className="space-y-12">
      {/* ------------------------------------------------------- the words */}
      <form action={action} className="border-t border-ink pt-3">
        <h2 className="note">The hero</h2>

        <input type="hidden" name="image" value={image} />

        {state.status === "sent" && state.message ? (
          <p role="status" className="mt-4 flex items-center gap-2 text-[0.9375rem] text-positive">
            <Check className="size-4" aria-hidden="true" />
            {state.message}
          </p>
        ) : null}

        <div className="mt-6 grid gap-8 lg:grid-cols-[1fr_1fr]">
          <div className="space-y-5">
            <Field
              name="eyebrow"
              label="The strip above the headline"
              required
              error={state.errors.eyebrow}
              hint="Lettered small on a rule. Keep it to a few words."
            >
              {(control) => (
                <Input {...control} defaultValue={value("eyebrow", hero.eyebrow)} />
              )}
            </Field>

            <Field
              name="headline"
              label="Headline"
              required
              error={state.errors.headline}
              hint="Set very large on the page, so three or four words to a line reads best."
            >
              {(control) => (
                <Textarea {...control} rows={2} defaultValue={value("headline", hero.headline)} />
              )}
            </Field>

            <Field name="body" label="The sentence underneath" required error={state.errors.body}>
              {(control) => (
                <Textarea {...control} rows={3} defaultValue={value("body", hero.body)} />
              )}
            </Field>

            <div className="grid gap-5 sm:grid-cols-2">
              <Field name="primaryLabel" label="First button" required error={state.errors.primaryLabel}>
                {(control) => (
                  <Input {...control} defaultValue={value("primaryLabel", hero.primaryLabel)} />
                )}
              </Field>
              <Field
                name="primaryHref"
                label="It goes to"
                required
                error={state.errors.primaryHref}
              >
                {(control) => (
                  <Input
                    {...control}
                    className="font-mono"
                    defaultValue={value("primaryHref", hero.primaryHref)}
                  />
                )}
              </Field>
              <Field
                name="secondaryLabel"
                label="Second button"
                required
                error={state.errors.secondaryLabel}
              >
                {(control) => (
                  <Input {...control} defaultValue={value("secondaryLabel", hero.secondaryLabel)} />
                )}
              </Field>
              <Field
                name="secondaryHref"
                label="It goes to"
                required
                error={state.errors.secondaryHref}
              >
                {(control) => (
                  <Input
                    {...control}
                    className="font-mono"
                    defaultValue={value("secondaryHref", hero.secondaryHref)}
                  />
                )}
              </Field>
            </div>

            <Button type="submit" size="lg" disabled={pending}>
              {pending ? "Saving" : "Save the hero"}
            </Button>
          </div>

          {/* --------------------------------------------- the photograph */}
          <div>
            <p className="note">The photograph</p>

            <div className="relative mt-3 aspect-4/3 overflow-hidden border border-line bg-surface-sunken">
              {chosen ? (
                <Image
                  src={chosen.url}
                  alt=""
                  fill
                  sizes="(min-width: 1024px) 40vw, 90vw"
                  className="object-cover"
                />
              ) : null}
            </div>

            {chosen?.credit ? (
              <p className="note mt-2">Photograph by {chosen.credit}</p>
            ) : null}

            <p className="note mt-5">Choose another</p>
            <ul className="mt-3 grid max-h-72 grid-cols-4 gap-2 overflow-y-auto border border-line p-2 sm:grid-cols-6">
              {images.map((entry) => (
                <li key={entry.key}>
                  <button
                    type="button"
                    onClick={() => setImage(entry.key)}
                    aria-pressed={entry.key === image}
                    title={entry.key}
                    className={cn(
                      "relative block aspect-square w-full overflow-hidden border transition-colors",
                      entry.key === image
                        ? "border-brick"
                        : "border-line hover:border-ink-muted",
                    )}
                  >
                    <Image
                      src={entry.url}
                      alt={entry.key}
                      fill
                      sizes="6rem"
                      className="object-cover"
                    />
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </form>

      <HotspotEditor
        imageUrl={chosen?.url ?? null}
        initial={hero.hotspots}
        products={products}
      />
    </div>
  );
}

function HotspotEditor({
  imageUrl,
  initial,
  products,
}: {
  imageUrl: string | null;
  initial: Hotspot[];
  products: Array<{ code: string; name: string }>;
}) {
  const [state, action, pending] = useActionState(saveHotspotsAction, emptyAuthState);
  const [points, setPoints] = useState<Hotspot[]>(initial);
  const [active, setActive] = useState<number | null>(null);
  const frameRef = useRef<HTMLDivElement>(null);

  const place = (event: React.MouseEvent<HTMLDivElement>) => {
    const frame = frameRef.current;
    if (!frame) return;

    const box = frame.getBoundingClientRect();
    const x = Math.round(((event.clientX - box.left) / box.width) * 1000) / 10;
    const y = Math.round(((event.clientY - box.top) / box.height) * 1000) / 10;

    const first = products[0];

    setPoints((current) => [
      ...current,
      { x, y, code: first?.code ?? "", label: first?.name ?? "New point" },
    ]);
    setActive(points.length);
  };

  const update = (index: number, patch: Partial<Hotspot>) =>
    setPoints((current) =>
      current.map((point, at) => (at === index ? { ...point, ...patch } : point)),
    );

  const nudge = (index: number, event: React.KeyboardEvent) => {
    const step = event.shiftKey ? 5 : 1;
    const moves: Record<string, [number, number]> = {
      ArrowLeft: [-step, 0],
      ArrowRight: [step, 0],
      ArrowUp: [0, -step],
      ArrowDown: [0, step],
    };

    const move = moves[event.key];
    if (!move) return;

    event.preventDefault();
    const point = points[index];

    update(index, {
      x: Math.min(100, Math.max(0, Math.round((point.x + move[0]) * 10) / 10)),
      y: Math.min(100, Math.max(0, Math.round((point.y + move[1]) * 10) / 10)),
    });
  };

  return (
    <form action={action} className="border-t border-ink pt-3">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <h2 className="note">Points marked on the photograph</h2>
        <p className="note">
          {points.length} {points.length === 1 ? "point" : "points"}
        </p>
      </div>

      <input type="hidden" name="hotspots" value={JSON.stringify(points)} />

      <p className="mt-4 max-w-2xl text-[0.9375rem] text-ink-soft">
        Press anywhere on the photograph to mark a piece of hardware. Each point names a
        product by its code, so it keeps working if the product is renamed, and it
        disappears from the site by itself if that product is ever withdrawn.
      </p>

      <div className="mt-6 grid gap-8 lg:grid-cols-[1.3fr_1fr]">
        <div>
          {imageUrl ? (
            <div
              ref={frameRef}
              onClick={place}
              className="relative aspect-16/10 cursor-crosshair overflow-hidden border border-line-strong bg-surface-sunken"
            >
              <Image src={imageUrl} alt="" fill sizes="60vw" className="object-cover" />

              {points.map((point, index) => (
                <button
                  key={`${point.code}-${index}`}
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    setActive(index);
                  }}
                  onKeyDown={(event) => nudge(index, event)}
                  aria-label={`${point.label}, ${point.x} per cent across and ${point.y} per cent down. Use the arrow keys to move it.`}
                  className={cn(
                    "absolute -translate-x-1/2 -translate-y-1/2 border bg-white/70 transition-[width,height]",
                    active === index
                      ? "size-5 border-brick"
                      : "size-3.5 border-white/80 hover:size-5",
                  )}
                  style={{ left: `${point.x}%`, top: `${point.y}%` }}
                />
              ))}
            </div>
          ) : (
            <p className="border border-dashed border-line-strong p-6 text-[0.9375rem] text-ink-muted">
              Choose a photograph above and it will appear here to mark up.
            </p>
          )}

          <p className="note mt-3 flex items-center gap-2">
            <Crosshair className="size-3.5" aria-hidden="true" />
            Press the picture to add a point
          </p>
        </div>

        <div>
          {points.length === 0 ? (
            <p className="text-[0.9375rem] text-ink-muted">
              No points yet. The photograph will show without any markers, which is a
              perfectly good hero.
            </p>
          ) : (
            <ol className="divide-y divide-line border-y border-line">
              {points.map((point, index) => (
                <li
                  key={`row-${index}`}
                  className={cn("space-y-2 py-3", active === index && "bg-brass-wash")}
                >
                  <div className="flex items-center gap-2">
                    <span className="note w-6 shrink-0">
                      {String(index + 1).padStart(2, "0")}
                    </span>

                    <label className="min-w-0 flex-1">
                      <span className="sr-only">Product for point {index + 1}</span>
                      <select
                        value={point.code}
                        onChange={(event) => {
                          const product = products.find(
                            (entry) => entry.code === event.target.value,
                          );
                          update(index, {
                            code: event.target.value,
                            label: product?.name ?? point.label,
                          });
                        }}
                        className="h-9 w-full border border-line-strong bg-surface px-2 text-[0.875rem]"
                      >
                        {products.map((product) => (
                          <option key={product.code} value={product.code}>
                            {product.name}
                          </option>
                        ))}
                      </select>
                    </label>

                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      className="text-critical hover:text-critical"
                      onClick={() =>
                        setPoints((current) => current.filter((_, at) => at !== index))
                      }
                    >
                      <X className="size-3.5" aria-hidden="true" />
                      <span className="sr-only">Remove point {index + 1}</span>
                    </Button>
                  </div>

                  <div className="flex items-center gap-2 ps-8">
                    <label className="min-w-0 flex-1">
                      <span className="sr-only">Label for point {index + 1}</span>
                      <input
                        value={point.label}
                        onChange={(event) => update(index, { label: event.target.value })}
                        placeholder="What to call it"
                        className="h-9 w-full border border-line-strong bg-surface px-2 text-[0.875rem]"
                      />
                    </label>
                    <span className="figure shrink-0 text-[0.75rem] text-ink-muted">
                      {point.x} / {point.y}
                    </span>
                  </div>
                </li>
              ))}
            </ol>
          )}

          <div className="mt-6 flex flex-wrap items-center gap-3">
            <Button type="submit" disabled={pending}>
              {pending ? "Saving" : "Save the points"}
            </Button>

            {state.status === "sent" && state.message ? (
              <p role="status" className="text-[0.9375rem] text-positive">
                {state.message}
              </p>
            ) : null}

            {state.errors.form ? (
              <p role="alert" className="text-[0.9375rem] text-critical">
                {state.errors.form}
              </p>
            ) : null}
          </div>
        </div>
      </div>
    </form>
  );
}
