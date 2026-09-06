"use client";

import Image from "next/image";
import { useActionState, useRef, useState } from "react";
import { ArrowDown, ArrowUp, Star, Trash2, Upload } from "lucide-react";

import { Button } from "@/components/ui/button";
import { emptyAuthState } from "@/lib/auth-form";
import {
  updateImageAction,
  uploadProductImagesAction,
} from "@/server/actions/admin-products";

/**
 * Photographs for one product.
 *
 * Uploading, ordering, choosing the one that leads and writing the alternative
 * text all happen here, because a product without a decent photograph is a
 * product nobody asks about, and this is the part of the catalogue that changes
 * most often.
 */

type AdminImage = {
  id: string;
  url: string;
  alt: string | null;
  isPrimary: boolean;
  sortOrder: number;
};

export function ProductImages({
  productId,
  images,
}: {
  productId: string;
  images: AdminImage[];
}) {
  const [state, action, pending] = useActionState(
    uploadProductImagesAction,
    emptyAuthState,
  );
  const [chosen, setChosen] = useState(0);
  const formRef = useRef<HTMLFormElement>(null);

  return (
    <section aria-labelledby="images-heading" className="space-y-5">
      <div>
        <h2 id="images-heading" className="text-lg text-ink">
          Photographs
        </h2>
        <p className="mt-1 text-[0.875rem] text-ink-muted">
          The first photograph is the one customers see on the card and in search results.
          Every upload is resized and its camera data removed before it is stored.
        </p>
      </div>

      <form
        ref={formRef}
        action={action}
        className="flex flex-wrap items-center gap-3 rounded-lg border border-dashed border-line-strong bg-surface-sunken px-4 py-4"
      >
        <input type="hidden" name="productId" value={productId} />

        <label
          htmlFor="product-images"
          className="text-[0.875rem] font-medium text-ink"
        >
          Add photographs
        </label>
        <input
          id="product-images"
          name="images"
          type="file"
          multiple
          accept="image/jpeg,image/png,image/webp"
          onChange={(event) => setChosen(event.target.files?.length ?? 0)}
          className="max-w-full text-[0.875rem] text-ink-soft file:mr-3 file:rounded-md file:border file:border-line-strong file:bg-surface-raised file:px-3 file:py-1.5 file:text-[0.875rem] file:text-ink"
        />

        <Button type="submit" variant="secondary" disabled={pending || chosen === 0}>
          <Upload className="size-4" aria-hidden="true" />
          {pending
            ? "Uploading"
            : chosen > 1
              ? `Upload ${chosen} images`
              : "Upload"}
        </Button>

        {state.errors.form ? (
          <p role="alert" className="basis-full text-[0.875rem] text-critical">
            {state.errors.form}
          </p>
        ) : null}

        {state.status === "sent" && state.message ? (
          <p role="status" className="basis-full text-[0.875rem] text-positive">
            {state.message}
          </p>
        ) : null}
      </form>

      {images.length === 0 ? (
        <p className="text-[0.9375rem] text-ink-muted">
          No photographs yet. This product will show a plain placeholder in the catalogue
          until one is added.
        </p>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {images.map((image, index) => (
            <li
              key={image.id}
              className="overflow-hidden rounded-lg border border-line bg-surface-raised"
            >
              <div className="relative aspect-4/3 bg-surface-sunken">
                <Image
                  src={image.url}
                  alt={image.alt ?? ""}
                  fill
                  sizes="(min-width: 1280px) 20rem, (min-width: 640px) 40vw, 90vw"
                  className="object-cover"
                />
                {image.isPrimary ? (
                  <span className="absolute left-2 top-2 rounded-md bg-ink px-2 py-1 text-[0.75rem] text-ink-inverse">
                    Leads
                  </span>
                ) : null}
              </div>

              <div className="space-y-3 p-3">
                <form action={updateImageAction} className="flex gap-2">
                  <input type="hidden" name="imageId" value={image.id} />
                  <input type="hidden" name="intent" value="alt" />
                  <label htmlFor={`alt-${image.id}`} className="sr-only">
                    Description of this photograph
                  </label>
                  <input
                    id={`alt-${image.id}`}
                    name="alt"
                    defaultValue={image.alt ?? ""}
                    placeholder="Describe the photograph"
                    className="h-9 min-w-0 flex-1 rounded-md border border-line-strong bg-surface px-2.5 text-[0.875rem]"
                  />
                  <Button type="submit" size="sm" variant="ghost">
                    Save
                  </Button>
                </form>

                <div className="flex flex-wrap gap-1.5">
                  {!image.isPrimary ? (
                    <ImageButton imageId={image.id} intent="primary" label="Make it lead">
                      <Star className="size-3.5" aria-hidden="true" />
                    </ImageButton>
                  ) : null}

                  {index > 0 ? (
                    <ImageButton imageId={image.id} intent="up" label="Move earlier">
                      <ArrowUp className="size-3.5" aria-hidden="true" />
                    </ImageButton>
                  ) : null}

                  {index < images.length - 1 ? (
                    <ImageButton imageId={image.id} intent="down" label="Move later">
                      <ArrowDown className="size-3.5" aria-hidden="true" />
                    </ImageButton>
                  ) : null}

                  <ImageButton imageId={image.id} intent="delete" label="Remove" danger>
                    <Trash2 className="size-3.5" aria-hidden="true" />
                  </ImageButton>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function ImageButton({
  imageId,
  intent,
  label,
  danger = false,
  children,
}: {
  imageId: string;
  intent: string;
  label: string;
  danger?: boolean;
  children: React.ReactNode;
}) {
  return (
    <form action={updateImageAction}>
      <input type="hidden" name="imageId" value={imageId} />
      <input type="hidden" name="intent" value={intent} />
      <Button
        type="submit"
        size="sm"
        variant="ghost"
        className={danger ? "text-critical hover:text-critical" : undefined}
      >
        {children}
        {label}
      </Button>
    </form>
  );
}
