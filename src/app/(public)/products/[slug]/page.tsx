import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { MessageCircle, Phone } from "lucide-react";

import { ProductCard } from "@/components/catalogue/product-card";
import { ProductGallery } from "@/components/catalogue/product-gallery";
import { ProductInquiryForm } from "@/components/catalogue/product-inquiry-form";
import { WhatsappLink } from "@/components/site/whatsapp-link";
import { Button } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";
import { Container } from "@/components/ui/container";
import { Dimension } from "@/components/ui/drawing";
import {
  availabilityLabel,
  availabilityTone,
  groupSpecifications,
  specificationValue,
} from "@/lib/catalogue";
import { site } from "@/lib/site";
import {
  getProductBySlug,
  listRelatedProducts,
} from "@/server/repositories/catalogue";
import { getContactContent } from "@/server/repositories/content";

export async function generateMetadata({
  params,
}: PageProps<"/products/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const product = await getProductBySlug(slug);

  if (!product) {
    return { title: "Product not found" };
  }

  const description =
    product.metaDescription ??
    product.shortDescription ??
    `${product.name}, product code ${product.code}, available from ${site.name} in Kathmandu.`;

  return {
    title: product.metaTitle ?? product.name,
    description,
    alternates: { canonical: `/products/${product.slug}` },
    openGraph: {
      type: "website",
      title: product.name,
      description,
      images: product.images[0]
        ? [{ url: product.images[0].url, alt: product.images[0].alt }]
        : undefined,
    },
  };
}

export default async function ProductDetailPage({
  params,
}: PageProps<"/products/[slug]">) {
  const { slug } = await params;
  const product = await getProductBySlug(slug);

  if (!product) {
    notFound();
  }

  const [related, contact] = await Promise.all([
    listRelatedProducts(product.id, product.category.id, 4),
    getContactContent(),
  ]);

  const specificationGroups = groupSpecifications(product.specifications);

  const attributes = [
    { label: "Product code", value: product.code },
    { label: "Category", value: product.category.name },
    { label: "Subcategory", value: product.subcategory?.name },
    { label: "Brand", value: product.brand?.name },
    { label: "Material", value: product.material?.name },
    { label: "Finish", value: product.finish?.name },
    { label: "Dimensions", value: product.dimensions },
    { label: "Application", value: product.application?.name },
  ].filter((attribute): attribute is { label: string; value: string } =>
    Boolean(attribute.value),
  );

  const whatsappMessage = `Hello Malhotra Enterprise, I would like to ask about ${product.name}, product code ${product.code}.`;

  // Structured data helps this page appear correctly in search results.
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    sku: product.code,
    description: product.shortDescription ?? product.description ?? undefined,
    category: product.category.name,
    brand: product.brand ? { "@type": "Brand", name: product.brand.name } : undefined,
    material: product.material?.name,
    image: product.images.map((image) => image.url),
    offers: {
      "@type": "Offer",
      availability:
        product.availability === "OUT_OF_STOCK"
          ? "https://schema.org/OutOfStock"
          : product.availability === "MADE_TO_ORDER"
            ? "https://schema.org/PreOrder"
            : "https://schema.org/InStock",
      seller: { "@type": "Organization", name: site.name },
    },
  };

  return (
    <>
      <script
        type="application/ld+json"
        // The payload is built above from our own database records.
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />

      <Container width="wide" className="sheet relative py-10 lg:py-14">
        <nav aria-label="Breadcrumb" className="note">
          <ol className="flex flex-wrap items-center gap-2 border-t border-ink pt-3">
            <li>
              <Link href="/" className="transition-colors hover:text-ink">
                Home
              </Link>
            </li>
            <li aria-hidden="true">/</li>
            <li>
              <Link href="/products" className="transition-colors hover:text-ink">
                Products
              </Link>
            </li>
            <li aria-hidden="true">/</li>
            <li>
              <Link
                href={`/products?category=${product.category.slug}`}
                className="transition-colors hover:text-ink"
              >
                {product.category.name}
              </Link>
            </li>
            <li aria-hidden="true">/</li>
            <li className="text-ink-soft">{product.name}</li>
          </ol>
        </nav>

        <div className="mt-10 grid gap-10 lg:grid-cols-2 lg:gap-16">
          <div>
            <ProductGallery images={product.images} productName={product.name} />

            {/* The measurement held on the product, annotated under the plate
                the way an overall dimension runs under an elevation. */}
            {product.dimensions ? (
              <Dimension value={product.dimensions} className="mt-5" />
            ) : null}
          </div>

          <div>
            <p className="note flex items-baseline justify-between gap-4 border-t border-ink pt-3">
              <span>{product.category.name}</span>
              <span className="normal-case tracking-normal">{product.code}</span>
            </p>

            <h1 className="mt-6 text-title text-ink">{product.name}</h1>

            <div className="mt-5 flex flex-wrap items-center gap-3">
              <Chip tone={availabilityTone(product.availability)}>
                {availabilityLabel(product.availability)}
              </Chip>
              {product.brand ? (
                <Chip tone="neutral">{product.brand.name}</Chip>
              ) : null}
            </div>

            {product.shortDescription ? (
              <p className="mt-6 text-[1.0625rem] leading-relaxed text-ink-soft">
                {product.shortDescription}
              </p>
            ) : null}

            <div className="mt-8 border-t border-line pt-8">
              <ProductInquiryForm
                productId={product.id}
                productName={product.name}
                availability={product.availability}
                variants={product.variants.map((variant) => ({
                  id: variant.id,
                  name: variant.name,
                  code: variant.code,
                  size: variant.size,
                  availability: variant.availability,
                  finish: variant.finish,
                }))}
              />
            </div>

            <div className="mt-8 border-t border-line pt-6">
              <h2 className="eyebrow">Ask about this product</h2>
              <ul className="mt-4 space-y-3 text-sm">
                <li className="flex items-center gap-3">
                  <MessageCircle
                    className="size-4 shrink-0 text-ink-muted"
                    aria-hidden="true"
                  />
                  <WhatsappLink
                    number={contact.whatsapp}
                    message={whatsappMessage}
                    className="text-ink underline underline-offset-4"
                  >
                    Ask about this product on WhatsApp
                  </WhatsappLink>
                </li>
                <li className="flex items-center gap-3">
                  <Phone className="size-4 shrink-0 text-ink-muted" aria-hidden="true" />
                  <a
                    href={`tel:${contact.phone.replace(/\s+/g, "")}`}
                    className="text-ink underline underline-offset-4"
                  >
                    Call {contact.phone}
                  </a>
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/* ------------------------------------------------- description */}
        {product.description ? (
          <section className="mt-16 border-t border-line pt-10" aria-labelledby="about-product">
            <h2 id="about-product" className="note">
              About this product
            </h2>
            <p className="mt-6 max-w-3xl text-[1.0625rem] leading-relaxed text-ink-soft">
              {product.description}
            </p>
          </section>
        ) : null}

        {/* ---------------------------------------------- specifications */}
        <section className="mt-14 border-t border-line pt-10" aria-labelledby="specifications">
          <h2 id="specifications" className="note">
            Specifications
          </h2>

          <div className="mt-6 grid gap-x-14 gap-y-10 lg:grid-cols-2">
            <div>
              <h3 className="note mb-3">Product details</h3>
              <dl className="divide-y divide-line border-y border-line">
                {attributes.map((attribute) => (
                  <div key={attribute.label} className="flex gap-4 py-2.5 text-sm">
                    <dt className="w-40 shrink-0 text-ink-muted">{attribute.label}</dt>
                    <dd className="figure text-ink">{attribute.value}</dd>
                  </div>
                ))}
              </dl>
            </div>

            {specificationGroups.map((group) => (
              <div key={group.group}>
                <h3 className="note mb-3">{group.group}</h3>
                <dl className="divide-y divide-line border-y border-line">
                  {group.items.map((item) => (
                    <div key={item.id} className="flex gap-4 py-2.5 text-sm">
                      <dt className="w-40 shrink-0 text-ink-muted">
                        {item.definition.label}
                      </dt>
                      <dd className="text-ink">
                        {specificationValue(item.value, item.definition.unit)}
                      </dd>
                    </div>
                  ))}
                </dl>
              </div>
            ))}
          </div>

          {product.tags.length > 0 ? (
            <div className="mt-8">
              <h3 className="note mb-3">Tags</h3>
              <ul className="flex flex-wrap gap-2">
                {product.tags.map((tag) => (
                  <li key={tag.slug}>
                    <Chip tone="neutral">{tag.name}</Chip>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </section>

        {/* --------------------------------------------------- variants */}
        {product.variants.length > 1 ? (
          <section className="mt-14 border-t border-line pt-10" aria-labelledby="variants">
            <h2 id="variants" className="text-2xl">
              Available options
            </h2>
            <div className="mt-6 overflow-x-auto">
              <table className="w-full min-w-[36rem] border-collapse text-sm">
                <caption className="sr-only">
                  Options available for {product.name}
                </caption>
                <thead>
                  <tr className="border-y border-line text-left text-[0.8125rem] text-ink-muted">
                    <th scope="col" className="py-2.5 pr-4 font-medium">
                      Option
                    </th>
                    <th scope="col" className="py-2.5 pr-4 font-medium">
                      Product code
                    </th>
                    <th scope="col" className="py-2.5 pr-4 font-medium">
                      Finish
                    </th>
                    <th scope="col" className="py-2.5 font-medium">
                      Availability
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {product.variants.map((variant) => (
                    <tr key={variant.id}>
                      <th scope="row" className="py-2.5 pr-4 text-left font-normal text-ink">
                        {variant.name}
                      </th>
                      <td className="py-2.5 pr-4 font-mono text-[0.8125rem] text-ink-muted">
                        {variant.code}
                      </td>
                      <td className="py-2.5 pr-4 text-ink-soft">
                        {variant.finish?.name ?? "As shown"}
                      </td>
                      <td className="py-2.5">
                        <Chip tone={availabilityTone(variant.availability)}>
                          {availabilityLabel(variant.availability)}
                        </Chip>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        ) : null}

        {/* ---------------------------------------------------- related */}
        {related.length > 0 ? (
          <section className="mt-16 border-t border-line pt-10" aria-labelledby="related">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <h2 id="related" className="text-2xl">
                More in {product.category.name}
              </h2>
              <Button asChild variant="secondary">
                <Link href={`/products?category=${product.category.slug}`}>
                  View the category
                </Link>
              </Button>
            </div>

            <ul className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {related.map((item) => (
                <li key={item.id} className="flex">
                  <ProductCard product={item} className="w-full" />
                </li>
              ))}
            </ul>
          </section>
        ) : null}
      </Container>
    </>
  );
}
