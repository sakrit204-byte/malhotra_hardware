import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { ProductForm } from "@/components/staff/product-form";
import { requireRole } from "@/server/auth/guards";
import { getEditorOptions } from "@/server/repositories/admin";

export const metadata: Metadata = {
  title: "New product",
  robots: { index: false, follow: false },
};

/**
 * A new product is created with its written detail first, and only then given
 * photographs, options and specifications, because those all need a product to
 * hang from. Saving here opens the full editor.
 */
export default async function NewProductPage() {
  await requireRole("ADMIN", "/admin/products/new");
  const options = await getEditorOptions();

  return (
    <div className="mx-auto max-w-4xl px-5 py-8 sm:px-8 lg:py-10">
      <Link
        href="/admin/products"
        className="inline-flex items-center gap-1.5 text-[0.875rem] text-ink-soft hover:text-ink"
      >
        <ArrowLeft className="size-4" aria-hidden="true" />
        All products
      </Link>

      <header className="mt-4">
        <p className="eyebrow">Catalogue</p>
        <h1 className="mt-2 text-[2rem] leading-[1.1]">A new product</h1>
        <p className="mt-3 text-ink-soft">
          Write the detail first. Photographs, options and specifications come next, on the
          screen that opens once this is saved. Nothing appears in the catalogue until you
          publish it.
        </p>
      </header>

      <div className="mt-8">
        <ProductForm product={null} options={options} />
      </div>
    </div>
  );
}
