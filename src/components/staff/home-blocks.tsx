"use client";

import Image from "next/image";
import { useActionState, useState } from "react";
import { ArrowDown, ArrowUp, Check, Plus, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { emptyAuthState } from "@/lib/auth-form";
import { cn } from "@/lib/cn";
import { saveInspirationAction, saveReasonsAction } from "@/server/actions/admin-home";

/**
 * The two remaining blocks of the home page.
 *
 * The dark numbered schedule, and the photographs at the foot of the page.
 * Both used to be JSON in a textarea. Here the schedule is a list of rows you
 * add and remove, and the photographs are chosen from the pictures actually on
 * the server, in the order they will be drawn.
 */

export function ReasonsEditor({
  initial,
}: {
  initial: {
    eyebrow: string;
    headline: string;
    items: Array<{ title: string; body: string; note?: string }>;
  };
}) {
  const [state, action, pending] = useActionState(saveReasonsAction, emptyAuthState);
  const [items, setItems] = useState(initial.items);

  const update = (
    index: number,
    patch: Partial<{ title: string; body: string; note: string }>,
  ) =>
    setItems((current) =>
      current.map((item, at) => (at === index ? { ...item, ...patch } : item)),
    );

  const move = (index: number, direction: -1 | 1) => {
    const next = [...items];
    const target = index + direction;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];
    setItems(next);
  };

  return (
    <form action={action} className="border-t border-ink pt-3">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <h2 className="note">Why Malhotra Enterprise</h2>
        <p className="note">
          {items.length} of 8 {items.length === 1 ? "box" : "boxes"}
        </p>
      </div>

      <input type="hidden" name="items" value={JSON.stringify(items)} />

      <div className="mt-6 grid gap-5 sm:grid-cols-2">
        <Field name="eyebrow" label="The lettering above the heading" required>
          {(control) => <Input {...control} defaultValue={initial.eyebrow} />}
        </Field>
        <Field name="headline" label="Heading" required>
          {(control) => <Input {...control} defaultValue={initial.headline} />}
        </Field>
      </div>

      <ol className="mt-8 divide-y divide-line border-y border-line">
        {items.map((item, index) => (
          <li key={index} className="grid gap-3 py-4 lg:grid-cols-[3rem_1fr_1.4fr_1fr_auto]">
            <p className="note pt-2">{String(index + 1).padStart(2, "0")}</p>

            <label>
              <span className="sr-only">Title of box {index + 1}</span>
              <input
                value={item.title}
                onChange={(event) => update(index, { title: event.target.value })}
                placeholder="Stock held in Kathmandu"
                className="h-10 w-full border border-line-strong bg-surface-raised px-2.5 text-[0.9375rem]"
              />
            </label>

            <label>
              <span className="sr-only">Body of box {index + 1}</span>
              <textarea
                value={item.body}
                onChange={(event) => update(index, { body: event.target.value })}
                rows={2}
                placeholder="A sentence or two saying why it matters."
                className="w-full resize-y border border-line-strong bg-surface-raised px-2.5 py-2 text-[0.9375rem]"
              />
            </label>

            <label>
              <span className="sr-only">The fact under box {index + 1}</span>
              <input
                value={item.note ?? ""}
                onChange={(event) => update(index, { note: event.target.value })}
                placeholder="Over 3,000 lines on the shelf"
                className="h-10 w-full border border-line-strong bg-surface-raised px-2.5 text-[0.9375rem]"
              />
            </label>

            <span className="flex items-start gap-1">
              <Button
                type="button"
                size="sm"
                variant="ghost"
                disabled={index === 0}
                onClick={() => move(index, -1)}
              >
                <ArrowUp className="size-3.5" aria-hidden="true" />
                <span className="sr-only">Move box {index + 1} up</span>
              </Button>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                disabled={index === items.length - 1}
                onClick={() => move(index, 1)}
              >
                <ArrowDown className="size-3.5" aria-hidden="true" />
                <span className="sr-only">Move box {index + 1} down</span>
              </Button>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                className="text-critical hover:text-critical"
                onClick={() => setItems(items.filter((_, at) => at !== index))}
              >
                <X className="size-3.5" aria-hidden="true" />
                <span className="sr-only">Remove box {index + 1}</span>
              </Button>
            </span>
          </li>
        ))}
      </ol>

      <div className="mt-6 flex flex-wrap items-center gap-3">
        {items.length < 8 ? (
          <Button
            type="button"
            variant="secondary"
            onClick={() => setItems([...items, { title: "", body: "", note: "" }])}
          >
            <Plus className="size-4" aria-hidden="true" />
            Add a box
          </Button>
        ) : null}

        <Button type="submit" disabled={pending}>
          {pending ? "Saving" : "Save this block"}
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

export function InspirationEditor({
  initial,
  images,
}: {
  initial: { eyebrow: string; headline: string; images: string[] };
  images: Array<{ key: string; url: string; credit: string | null }>;
}) {
  const [state, action, pending] = useActionState(saveInspirationAction, emptyAuthState);
  const [chosen, setChosen] = useState(initial.images);

  const byKey = new Map(images.map((image) => [image.key, image]));

  const move = (index: number, direction: -1 | 1) => {
    const next = [...chosen];
    const target = index + direction;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];
    setChosen(next);
  };

  return (
    <form action={action} className="border-t border-ink pt-3">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <h2 className="note">Where our hardware is put to work</h2>
        <p className="note">{chosen.length} of 6 chosen</p>
      </div>

      <input type="hidden" name="images" value={chosen.join(",")} />

      <div className="mt-6 grid gap-5 sm:grid-cols-2">
        <Field name="eyebrow" label="The lettering above the heading" required>
          {(control) => <Input {...control} defaultValue={initial.eyebrow} />}
        </Field>
        <Field name="headline" label="Heading" required>
          {(control) => <Input {...control} defaultValue={initial.headline} />}
        </Field>
      </div>

      <p className="mt-6 max-w-2xl text-[0.9375rem] text-ink-soft">
        The first photograph runs the full width of the page, and the rest pair off
        underneath it.
      </p>

      <div className="mt-6 grid gap-8 lg:grid-cols-[1fr_1fr]">
        <ol className="divide-y divide-line border-y border-line">
          {chosen.length === 0 ? (
            <li className="py-4 text-[0.9375rem] text-ink-muted">
              Nothing chosen, so this block does not appear on the page at all.
            </li>
          ) : null}

          {chosen.map((key, index) => (
            <li key={key} className="flex items-center gap-3 py-2.5">
              <span className="note w-6 shrink-0">
                {index === 0 ? "Wide" : String(index + 1).padStart(2, "0")}
              </span>
              <span className="relative size-12 shrink-0 overflow-hidden border border-line bg-surface-sunken">
                {byKey.get(key) ? (
                  <Image
                    src={byKey.get(key)!.url}
                    alt=""
                    fill
                    sizes="3rem"
                    className="object-cover"
                  />
                ) : null}
              </span>
              <span className="note min-w-0 flex-1 truncate">{key}</span>
              <span className="flex shrink-0 gap-1">
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  disabled={index === 0}
                  onClick={() => move(index, -1)}
                >
                  <ArrowUp className="size-3.5" aria-hidden="true" />
                  <span className="sr-only">Move {key} up</span>
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  disabled={index === chosen.length - 1}
                  onClick={() => move(index, 1)}
                >
                  <ArrowDown className="size-3.5" aria-hidden="true" />
                  <span className="sr-only">Move {key} down</span>
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  className="text-critical hover:text-critical"
                  onClick={() => setChosen(chosen.filter((entry) => entry !== key))}
                >
                  <X className="size-3.5" aria-hidden="true" />
                  <span className="sr-only">Remove {key}</span>
                </Button>
              </span>
            </li>
          ))}
        </ol>

        <div>
          <p className="note">Choose from the photographs on the server</p>
          <ul className="mt-3 grid max-h-72 grid-cols-4 gap-2 overflow-y-auto border border-line p-2 sm:grid-cols-6">
            {images.map((image) => {
              const picked = chosen.includes(image.key);

              return (
                <li key={image.key}>
                  <button
                    type="button"
                    title={image.key}
                    aria-pressed={picked}
                    disabled={!picked && chosen.length >= 6}
                    onClick={() =>
                      setChosen(
                        picked
                          ? chosen.filter((entry) => entry !== image.key)
                          : [...chosen, image.key],
                      )
                    }
                    className={cn(
                      "relative block aspect-square w-full overflow-hidden border transition-colors",
                      picked ? "border-brick" : "border-line hover:border-ink-muted",
                      !picked && chosen.length >= 6 && "opacity-40",
                    )}
                  >
                    <Image
                      src={image.url}
                      alt={image.key}
                      fill
                      sizes="6rem"
                      className="object-cover"
                    />
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      </div>

      <div className="mt-6 flex flex-wrap items-center gap-3">
        <Button type="submit" disabled={pending}>
          {pending ? "Saving" : "Save this block"}
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
