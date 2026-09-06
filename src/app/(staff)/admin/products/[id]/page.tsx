import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Copy, ExternalLink, Trash2 } from "lucide-react";

import { ProductForm } from "@/components/staff/product-form";
import { ProductImages } from "@/components/staff/product-images";
import { ProductSpecifications } from "@/components/staff/product-specifications";
import { ProductVariants } from "@/components/staff/product-variants";
import { Button } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";
import {
  deleteProductAction,
  duplicateProductAction,
} from "@/server/actions/admin-products";
import { requireRole } from "@/server/auth/guards";
import { getEditorOptions, getProductForAdmin } from "@/server/repositories/admin";

export const metadata: Metadata = {
  title: "Edit product",
  robots: { index: false, follow: false },
};

/**
 * The full product editor.
 *
 * Everything about one product on one screen, in the order it matters: the
 * written detail, the photographs, the options a customer chooses between and
 * the specifications an architect reads. A save on any of them is live on the
 * public catalogue immediately.
 */
export default async function EditProductPage({ params }: PageProps<"/admin/products/[id]">) {
  const { id } = await params;
  await requireRole("ADMIN", `/admin/products/${id}`);

  const [product, options] = await Promise.all([
    getProductForAdmin(id),
    getEditorOptions(),
  ]);

  if (!product) notFound();

  return (
    <div className="mx-auto max-w-5xl px-5 py-8 sm:px-8 lg:py-10">
      <Link
        href="/admin/products"
        className="inline-flex items-center gap-1.5 text-[0.875rem] text-ink-soft hover:text-ink"
      >
        <ArrowLeft className="size-4" aria-hidden="true" />
        All products
      </Link>

      <header className="mt-4 flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <p className="eyebrow">{product.code}</p>
            <Chip tone={product.isPublished ? "positive" : "neutral"}>
              {product.isPublished ? "Published" : "Draft"}
            </Chip>
          </div>
          <h1 className="mt-2 text-[2rem] leading-[1.1]">{product.name}</h1>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {product.isPublished ? (
            <Button asChild variant="ghost" size="sm">
              <Link href={`/products/${product.slug}`} target="_blank" rel="noreferrer">
                <ExternalLink className="size-3.5" aria-hidden="true" />
                View on the site
              </Link>
            </Button>
          ) : null}

          <form action={duplicateProductAction}>
            <input type="hidden" name="id" value={product.id} />
            <Button type="submit" variant="secondary" size="sm">
              <Copy className="size-3.5" aria-hidden="true" />
              Duplicate
            </Button>
          </form>
        </div>
      </header>

      <div className="mt-8 space-y-12">
        {/*
          Only the fields the form edits cross into the browser, rather than the
          whole record with its images, options and specifications attached.
        */}
        <ProductForm
          product={{
            id: product.id,
            name: product.name,
            code: product.code,
            categoryId: product.categoryId,
            subcategoryId: product.subcategoryId,
            brandId: product.brandId,
            materialId: product.materialId,
            finishId: product.finishId,
            applicationId: product.applicationId,
            shortDescription: product.shortDescription,
            description: product.description,
            dimensions: product.dimensions,
            availability: product.availability,
            isPublished: product.isPublished,
            isFeatured: product.isFeatured,
            isPopular: product.isPopular,
            metaTitle: product.metaTitle,
            metaDescription: product.metaDescription,
          }}
          options={options}
        />

        <div className="border-t border-line pt-10">
          <ProductImages productId={product.id} images={product.images} />
        </div>

        <div className="border-t border-line pt-10">
          <ProductVariants
            productId={product.id}
            variants={product.variants}
            finishes={options.finishes}
          />
        </div>

        <div className="border-t border-line pt-10">
          <ProductSpecifications
            productId={product.id}
            specifications={product.specifications}
            definitions={options.definitions}
          />
        </div>

        <div className="border-t border-line pt-10">
          <h2 className="text-lg text-ink">Remove this product</h2>
          <p className="mt-1 max-w-2xl text-[0.875rem] text-ink-muted">
            The product leaves the catalogue, the filters and the sitemap. It stays on any
            inquiry that already mentions it, so paperwork a customer has already received
            still reads correctly.
          </p>

          <form action={deleteProductAction} className="mt-4">
            <input type="hidden" name="id" value={product.id} />
            <Button type="submit" variant="danger" size="sm">
              <Trash2 className="size-3.5" aria-hidden="true" />
              Remove {product.name}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
