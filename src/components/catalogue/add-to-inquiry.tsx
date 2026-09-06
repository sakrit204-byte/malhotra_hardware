"use client";

import { Check, Plus, TriangleAlert } from "lucide-react";
import { useActionState, useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/cn";
import { addToInquiry, type BasketActionResult } from "@/server/actions/inquiry-basket";

/**
 * Adds a product to the inquiry workspace.
 *
 * It is a real form posting to a server action, so it works without JavaScript.
 * With JavaScript the page is not replaced: the button reports what happened in
 * place, and the result is announced through a live region.
 *
 * In compact form, used on a catalogue card, the button label carries the whole
 * result and nothing is printed underneath. That keeps a grid of cards from
 * jumping when one of them succeeds, while the live region still announces the
 * outcome to anyone listening.
 */
export function AddToInquiry({
  productId,
  variantId,
  quantity = 1,
  label = "Add to Inquiry",
  size = "sm",
  variant = "secondary",
  block = false,
  compact = false,
  showMessage = false,
  className,
}: {
  productId: string;
  variantId?: string;
  quantity?: number;
  label?: string;
  size?: "sm" | "md" | "lg";
  variant?: "primary" | "secondary" | "brass";
  block?: boolean;
  /** Button only, with the result carried by its own label. */
  compact?: boolean;
  showMessage?: boolean;
  className?: string;
}) {
  const [state, formAction, pending] = useActionState<BasketActionResult | null, FormData>(
    addToInquiry,
    null,
  );

  // The confirmation is derived from the action result rather than mirrored
  // into separate state. A timer marks the result as acknowledged, which
  // returns the button to its resting label.
  const [acknowledged, setAcknowledged] = useState<BasketActionResult | null>(null);
  const settled = state !== null && state !== acknowledged;
  const justAdded = settled && state.ok;
  const failed = settled && !state.ok;

  useEffect(() => {
    if (!settled) return;

    // Anything listening, in practice the inquiry drawer, is told what was
    // just added. The button itself stays self contained: it works exactly
    // the same when nothing is listening.
    if (state.ok) {
      window.dispatchEvent(
        new CustomEvent("inquiry:added", {
          detail: { productId, variantId: variantId ?? null },
        }),
      );
    }

    const timer = setTimeout(() => setAcknowledged(state), failed ? 5000 : 2600);
    return () => clearTimeout(timer);
  }, [settled, failed, state, productId, variantId]);

  const buttonLabel = pending
    ? "Adding"
    : justAdded
      ? "Added"
      : failed
        ? "Unavailable"
        : label;

  return (
    <form action={formAction} className={cn(block && "w-full", className)}>
      <input type="hidden" name="productId" value={productId} />
      {variantId ? <input type="hidden" name="variantId" value={variantId} /> : null}
      <input type="hidden" name="quantity" value={quantity} />

      <Button
        type="submit"
        variant={failed ? "danger" : variant}
        size={size}
        block={block}
        disabled={pending}
        aria-disabled={pending}
      >
        {justAdded ? (
          <Check className="size-4 shrink-0" aria-hidden="true" />
        ) : failed ? (
          <TriangleAlert className="size-4 shrink-0" aria-hidden="true" />
        ) : (
          <Plus className="size-4 shrink-0" aria-hidden="true" />
        )}
        {buttonLabel}
      </Button>

      <p
        role="status"
        aria-live="polite"
        className={cn(
          // A failure is always shown in full unless the caller is compact, in
          // which case the button label carries it and this stays for screen
          // readers only.
          !compact && state && (showMessage || !state.ok)
            ? cn("mt-1.5 block text-[0.8125rem]", state.ok ? "text-positive" : "text-critical")
            : "sr-only",
        )}
      >
        {state?.message ?? ""}
      </p>
    </form>
  );
}
