import type { Metadata } from "next";
import Link from "next/link";
import { ExternalLink } from "lucide-react";

import { HeroEditor } from "@/components/staff/hero-editor";
import { InspirationEditor, ReasonsEditor } from "@/components/staff/home-blocks";
import { HomeComposer } from "@/components/staff/home-composer";
import { Button } from "@/components/ui/button";
import { requireRole } from "@/server/auth/guards";
import { getHomeComposerOptions } from "@/server/repositories/admin";
import {
  getHeroContent,
  getInspirationContent,
  getReasonsContent,
  getShowcaseContent,
} from "@/server/repositories/content";

export const metadata: Metadata = {
  title: "The home page",
  robots: { index: false, follow: false },
};

/**
 * The home page, as a screen rather than a file.
 *
 * Everything a visitor sees before they reach the catalogue is set here: the
 * headline, the photograph, the points marked on it, which categories are
 * offered first and which products are shown. None of it needs a developer, and
 * none of it needs anybody to understand what JSON is.
 */
export default async function AdminHomePage() {
  await requireRole("ADMIN", "/admin/home");

  const [hero, showcase, reasons, inspiration, options] = await Promise.all([
    getHeroContent(),
    getShowcaseContent(),
    getReasonsContent(),
    getInspirationContent(),
    getHomeComposerOptions(),
  ]);

  // Until somebody has arranged the page, the flags already on the products
  // stand in, so this screen opens showing what the site is actually doing
  // rather than an empty list.
  const initial = {
    featured: showcase.featured.length > 0 ? showcase.featured : options.current.featured,
    popular: showcase.popular.length > 0 ? showcase.popular : options.current.popular,
    categories:
      showcase.categories.length > 0 ? showcase.categories : options.current.categories,
  };

  return (
    <div className="mx-auto max-w-6xl px-5 py-8 sm:px-8 lg:py-10">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="note">Administration</p>
          <h1 className="mt-3 text-[2.5rem] leading-[1.05]">The home page</h1>
          <p className="mt-4 max-w-2xl text-ink-soft">
            Everything on the front of the site is set here, and a save is live
            immediately. Nothing on this screen needs a developer.
          </p>
        </div>

        <Button asChild variant="secondary">
          <Link href="/" target="_blank" rel="noreferrer">
            <ExternalLink className="size-4" aria-hidden="true" />
            See the site
          </Link>
        </Button>
      </header>

      <div className="mt-12 space-y-16">
        <HeroEditor
          hero={hero}
          images={options.images}
          products={options.products.map((product) => ({
            code: product.code,
            name: product.name,
          }))}
        />

        <HomeComposer
          initial={initial}
          products={options.products.map((product) => ({
            value: product.code,
            label: product.name,
            note: `${product.code}, ${product.category}`,
            image: product.image,
          }))}
          categories={options.categories.map((category) => ({
            value: category.slug,
            label: category.name,
            note: `${category.count} ${category.count === 1 ? "product" : "products"}`,
            image: category.image,
          }))}
        />

        <ReasonsEditor initial={reasons} />

        <InspirationEditor initial={inspiration} images={options.images} />
      </div>
    </div>
  );
}
