"use client";

import { Minus, Plus, Trash2 } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useRef, useState, useTransition } from "react";

import { Chip } from "@/components/ui/chip";
import { availabilityLabel, availabilityTone, productHref } from "@/lib/catalogue";
import { cn } from "@/lib/cn";
import {
  changeInquiryVariant,
  removeFromInquiry,
  updateInquiryLine,
} from "@/server/actions/inquiry-basket";
import type { ResolvedLine } from "@/server/inquiry/resolve";

/**
 * One product in the inquiry workspace.
 *
 * Every control is a form posting to a server action, so the whole workspace
 * works with JavaScript turned off. With JavaScript the forms submit themselves
 * on change and the row dims while the server catches up, which keeps the page
 * honest about what has actually been saved.
 */
export function InquiryLine({
  line,
}: {
  line: ResolvedLine;
}) {
  const [pending, startTransition] = useTransition();
  const [quantity, setQuantity] = useState(line.quantity);

  const quantityFormRef = useRef<HTMLFormElement>(null);

  const submitQuantity = (next: number) => {
    const clamped = Math.max(1, Math.min(9999, next));
    setQuantity(clamped);

    startTransition(() => {
      const data = new FormData();
      data.set("productId", line.productId);
      if (line.variantId) data.set("variantId", line.variantId);
      data.set("quantity", String(clamped));
      void updateInquiryLine(data);
    });
  };

  return (
    <li
      className={cn(
        "flex gap-4 border-t border-line py-6 transition-opacity",
        pending && "opacity-60",
      )}
    >
      <Link
        href={productHref(line.product.slug)}
        className="group relative size-24 shrink-0 overflow-hidden border border-line bg-surface-sunken sm:size-32"
      >
        {line.product.imageUrl ? (
          <Image
            src={line.product.imageUrl}
            alt={line.product.imageAlt}
            fill
            sizes="8rem"
            className="object-cover transition-transform duration-500 ease-[--ease-quiet] group-hover:scale-105"
          />
        ) : null}
      </Link>

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-1">
          <div className="min-w-0">
            <p className="note">{line.product.categoryName}</p>
            <h3 className="mt-1 text-[1.0625rem] leading-snug text-ink">
              <Link
                href={productHref(line.product.slug)}
                className="underline-offset-4 hover:underline"
              >
                {line.product.name}
              </Link>
            </h3>
            <p className="figure mt-1 text-[0.75rem] text-ink-muted">
              {line.variant?.code ?? line.product.code}
            </p>
          </div>

          <div className="flex flex-col items-end gap-1.5">
            <Chip tone={availabilityTone(line.variant?.availability ?? line.product.availability)}>
              {availabilityLabel(line.variant?.availability ?? line.product.availability)}
            </Chip>
          </div>
        </div>

        {/* ------------------------------------------------------- options */}
        {line.variantOptions.length > 0 ? (
          <form
            action={changeInquiryVariant}
            className="mt-3 flex flex-wrap items-center gap-2"
          >
            <input type="hidden" name="productId" value={line.productId} />
            <input
              type="hidden"
              name="currentVariantId"
              value={line.variantId ?? ""}
            />
            <label
              htmlFor={`variant-${line.productId}`}
              className="text-[0.8125rem] text-ink-muted"
            >
              Option
            </label>
            <select
              id={`variant-${line.productId}`}
              name="variantId"
              defaultValue={line.variantId ?? ""}
              onChange={(event) => {
                const form = event.currentTarget.form;
                if (form) startTransition(() => form.requestSubmit());
              }}
              className={cn(
                "h-10 border bg-surface-raised px-2.5 text-[0.875rem] focus:border-brand focus:outline-none",
                line.needsVariantChoice
                  ? "border-critical text-critical"
                  : "border-line-strong hover:border-ink-muted",
              )}
              aria-invalid={line.needsVariantChoice || undefined}
            >
              {/* Without this, a line with no option chosen would display the
                  first option as though it had been selected. */}
              <option value="">
                {line.needsVariantChoice ? "Choose an option" : "Not specified"}
              </option>
              {line.variantOptions.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.name}
                </option>
              ))}
            </select>
            <noscript>
              <button
                type="submit"
                className="text-[0.8125rem] underline underline-offset-4"
              >
                Change
              </button>
            </noscript>
          </form>
        ) : null}

        {line.needsVariantChoice ? (
          <p className="mt-2 text-[0.8125rem] text-critical">
            The option you chose is no longer offered. Please pick another before sending.
          </p>
        ) : null}

        {/* ------------------------------------------------------ quantity */}
        <div className="mt-4 flex flex-wrap items-end gap-6">
          <form ref={quantityFormRef} action={updateInquiryLine}>
            <input type="hidden" name="productId" value={line.productId} />
            {line.variantId ? (
              <input type="hidden" name="variantId" value={line.variantId} />
            ) : null}

            <label
              htmlFor={`quantity-${line.productId}`}
              className="block text-[0.8125rem] text-ink-muted"
            >
              Quantity
            </label>
            <div className="mt-1.5 flex items-center">
              <button
                type="button"
                onClick={() => submitQuantity(quantity - 1)}
                className="inline-flex size-10 items-center justify-center border border-line-strong text-ink-soft transition-colors hover:border-brand hover:text-brand"
              >
                <Minus className="size-3.5" aria-hidden="true" />
                <span className="sr-only">
                  Decrease quantity of {line.product.name}
                </span>
              </button>
              <input
                id={`quantity-${line.productId}`}
                name="quantity"
                type="number"
                min={1}
                max={9999}
                value={quantity}
                onChange={(event) => setQuantity(Number(event.target.value) || 1)}
                onBlur={() => submitQuantity(quantity)}
                className="figure h-10 w-16 border-y border-line-strong bg-surface-raised text-center focus:border-brand focus:outline-none"
              />
              <button
                type="button"
                onClick={() => submitQuantity(quantity + 1)}
                className="inline-flex size-10 items-center justify-center border border-line-strong text-ink-soft transition-colors hover:border-brand hover:text-brand"
              >
                <Plus className="size-3.5" aria-hidden="true" />
                <span className="sr-only">
                  Increase quantity of {line.product.name}
                </span>
              </button>
              <noscript>
                <button
                  type="submit"
                  className="ml-2 text-[0.8125rem] underline underline-offset-4"
                >
                  Update
                </button>
              </noscript>
            </div>
          </form>

          <form action={removeFromInquiry}>
            <input type="hidden" name="productId" value={line.productId} />
            {line.variantId ? (
              <input type="hidden" name="variantId" value={line.variantId} />
            ) : null}
            <button
              type="submit"
              className="inline-flex h-9 items-center gap-1.5 text-[0.8125rem] text-ink-soft underline underline-offset-4 hover:text-critical"
            >
              <Trash2 className="size-3.5" aria-hidden="true" />
              Remove
              <span className="sr-only"> {line.product.name} from the inquiry</span>
            </button>
          </form>
        </div>

        {/* ---------------------------------------------------------- note */}
        <form action={updateInquiryLine} className="mt-4">
          <input type="hidden" name="productId" value={line.productId} />
          {line.variantId ? (
            <input type="hidden" name="variantId" value={line.variantId} />
          ) : null}
          <input type="hidden" name="quantity" value={quantity} />

          <label
            htmlFor={`note-${line.productId}`}
            className="block text-[0.8125rem] text-ink-muted"
          >
            Note for this product
          </label>
          <textarea
            id={`note-${line.productId}`}
            name="note"
            rows={2}
            maxLength={500}
            defaultValue={line.note ?? ""}
            placeholder="Door thickness, handing, or anything else our team should know."
            onBlur={(event) => {
              const form = event.currentTarget.form;
              if (form) startTransition(() => form.requestSubmit());
            }}
            className="mt-1.5 w-full rounded-md border border-line-strong bg-surface-raised px-3 py-2 text-[0.8125rem] leading-relaxed hover:border-ink-muted"
          />
          <noscript>
            <button
              type="submit"
              className="mt-1 text-[0.8125rem] underline underline-offset-4"
            >
              Save note
            </button>
          </noscript>
        </form>
      </div>
    </li>
  );
}
