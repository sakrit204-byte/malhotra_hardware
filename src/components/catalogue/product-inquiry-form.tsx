"use client";

import { Check, Minus, Plus } from "lucide-react";
import Link from "next/link";
import { useActionState, useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { availabilityLabel } from "@/lib/catalogue";
import { cn } from "@/lib/cn";
import { addToInquiry, type BasketActionResult } from "@/server/actions/inquiry-basket";

type Variant = {
  id: string;
  name: string;
  code: string;
  size: string | null;
  availability: string;
  finish: { name: string; swatchHex: string | null } | null;
};

/**
 * Choose an option, a quantity and a note, then add the product to the inquiry.
 *
 * The variant choice is a radio group rather than a dropdown, because the
 * finish is the decision most customers are actually making and it deserves to
 * be visible. Everything posts to a server action, so it works without
 * JavaScript; with JavaScript the confirmation appears in place.
 */
export function ProductInquiryForm({
  productId,
  productName,
  variants,
  availability,
}: {
  productId: string;
  productName: string;
  variants: Variant[];
  availability: string;
}) {
  const [state, formAction, pending] = useActionState<BasketActionResult | null, FormData>(
    addToInquiry,
    null,
  );
  const [selected, setSelected] = useState(variants[0]?.id ?? "");
  const [quantity, setQuantity] = useState(1);

  // Derived from the action result, then acknowledged by a timer, so the
  // confirmation clears itself without a second copy of the same state.
  const [acknowledged, setAcknowledged] = useState<BasketActionResult | null>(null);
  const added = Boolean(state?.ok) && state !== acknowledged;

  useEffect(() => {
    if (!added) return;

    const timer = setTimeout(() => setAcknowledged(state), 4000);
    return () => clearTimeout(timer);
  }, [added, state]);

  const activeVariant = variants.find((variant) => variant.id === selected);

  // Updates as the option and the quantity change, so the cost of the choice is
  // visible before the product ever reaches the inquiry list.

  return (
    <form action={formAction} className="space-y-6">
      <input type="hidden" name="productId" value={productId} />

      {variants.length > 0 ? (
        <fieldset>
          <legend className="flex items-baseline gap-3 text-[0.875rem] font-medium text-ink">
            Choose an option
            <span className="note">{variants.length} available</span>
          </legend>

          <div className="mt-3 flex flex-wrap gap-2">
            {variants.map((variant) => {
              const id = `variant-${variant.id}`;
              const active = variant.id === selected;

              return (
                <div key={variant.id}>
                  <input
                    type="radio"
                    id={id}
                    name="variantId"
                    value={variant.id}
                    checked={active}
                    onChange={() => setSelected(variant.id)}
                    className="peer sr-only"
                  />
                  <label
                    htmlFor={id}
                    className={cn(
                      "flex cursor-pointer items-center gap-2.5 border px-3.5 py-2.5 text-[0.875rem] transition-[border-color,background-color,color,transform] duration-[--duration-quick] ease-[--ease-quiet]",
                      "peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-[var(--color-focus)]",
                      active
                        ? "border-brand bg-brand-wash text-ink"
                        : "border-line-strong text-ink-soft hover:-translate-y-px hover:border-ink-muted hover:text-ink",
                    )}
                  >
                    {variant.finish?.swatchHex ? (
                      <span
                        className="size-3.5 border border-line-strong"
                        style={{ backgroundColor: variant.finish.swatchHex }}
                        aria-hidden="true"
                      />
                    ) : null}
                    {variant.name}
                  </label>
                </div>
              );
            })}
          </div>

          {activeVariant ? (
            <p className="note mt-4">
              {activeVariant.code}, {availabilityLabel(activeVariant.availability)}
            </p>
          ) : null}
        </fieldset>
      ) : (
        <p className="text-[0.8125rem] text-ink-muted">
          {availabilityLabel(availability)}
        </p>
      )}

      <div className="flex flex-wrap items-end gap-6">
        <div>
          <label htmlFor="quantity" className="block text-[0.875rem] font-medium text-ink">
            Quantity
          </label>
          <div className="mt-2 flex items-center">
            <button
              type="button"
              onClick={() => setQuantity((value) => Math.max(1, value - 1))}
              className="inline-flex size-11 items-center justify-center border border-line-strong text-ink-soft transition-colors hover:border-brand hover:text-brand"
            >
              <Minus className="size-4" aria-hidden="true" />
              <span className="sr-only">Decrease quantity</span>
            </button>
            <input
              id="quantity"
              name="quantity"
              type="number"
              min={1}
              max={9999}
              value={quantity}
              onChange={(event) =>
                setQuantity(Math.max(1, Math.min(9999, Number(event.target.value) || 1)))
              }
              className="figure h-11 w-20 border-y border-line-strong bg-surface-raised text-center focus:border-brand focus:outline-none"
            />
            <button
              type="button"
              onClick={() => setQuantity((value) => Math.min(9999, value + 1))}
              className="inline-flex size-11 items-center justify-center border border-line-strong text-ink-soft transition-colors hover:border-brand hover:text-brand"
            >
              <Plus className="size-4" aria-hidden="true" />
              <span className="sr-only">Increase quantity</span>
            </button>
          </div>
        </div>

      </div>

      <div>
        <label htmlFor="note" className="flex items-baseline gap-3 text-[0.875rem] font-medium text-ink">
          Note for this product
          <span className="note">Optional</span>
        </label>
        <textarea
          id="note"
          name="note"
          rows={2}
          maxLength={500}
          placeholder="Door thickness, handing, or anything else our team should know."
          className="mt-2 w-full border border-line-strong bg-surface-raised px-3.5 py-3 text-[0.9375rem] leading-relaxed transition-[border-color,box-shadow] duration-[--duration-quick] hover:border-ink-muted focus:border-brand focus:shadow-[0_0_0_3px_var(--color-brand-wash)] focus:outline-none"
        />
      </div>

      <div className="flex flex-wrap gap-3">
        <Button type="submit" size="lg" disabled={pending} aria-disabled={pending}>
          {added ? (
            <Check className="size-4" aria-hidden="true" />
          ) : (
            <Plus className="size-4" aria-hidden="true" />
          )}
          {pending ? "Adding" : added ? "Added to inquiry" : "Add to Inquiry"}
        </Button>

        {added ? (
          <Button asChild size="lg" variant="secondary">
            <Link href="/inquiry">Review inquiry</Link>
          </Button>
        ) : null}
      </div>

      <p
        role="status"
        aria-live="polite"
        className={cn(
          "text-[0.8125rem]",
          state?.ok ? "text-positive" : "text-critical",
          state ? "block" : "sr-only",
        )}
      >
        {state?.message ?? `Ready to add ${productName} to your inquiry.`}
      </p>
    </form>
  );
}
