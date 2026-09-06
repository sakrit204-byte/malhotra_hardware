import "server-only";

import { prisma } from "@/server/db/prisma";

/**
 * Editable site content.
 *
 * Homepage copy, imagery and contact details live in the site_content table so
 * an administrator can change them without a deploy. Every reader supplies a
 * fallback, so a missing or malformed record degrades to sensible defaults
 * rather than an empty page.
 */

/** A point marked on the hero photograph, tied to a product by its code. */
export type HeroHotspot = {
  /** Percentage across the photograph, from the left. */
  x: number;
  /** Percentage down the photograph, from the top. */
  y: number;
  /** Product code, so the point survives a product being renamed. */
  code: string;
  label: string;
};

export type HeroContent = {
  eyebrow: string;
  headline: string;
  body: string;
  primaryLabel: string;
  primaryHref: string;
  secondaryLabel: string;
  secondaryHref: string;
  image: string;
  hotspots: HeroHotspot[];
};

export type ReasonsContent = {
  eyebrow: string;
  headline: string;
  /**
   * Each one is drawn as a box. The note is the hard fact underneath the
   * sentence, lettered small, and it is what makes a box worth reading twice
   * rather than a heading with a paragraph under it.
   */
  items: Array<{ title: string; body: string; note?: string }>;
};

export type InspirationContent = {
  eyebrow: string;
  headline: string;
  images: string[];
};

export type ContactContent = {
  phone: string;
  whatsapp: string;
  email: string;
  addressLines: string[];
  hours: Array<{ days: string; time: string }>;
  mapNote?: string;
};

export type AboutContent = {
  headline: string;
  paragraphs: string[];
  image: string;
};

/**
 * What the home page shows, and in what order.
 *
 * Held as lists of codes and slugs rather than as a column on each row, because
 * a product's own sort order is the catalogue's business and the home page is a
 * separate arrangement. Keeping them apart is what lets an administrator drag
 * the featured row into the order they want without quietly reshuffling the
 * catalogue behind it.
 *
 * The lists name products by code and categories by slug, so a rename does not
 * empty the home page.
 */
export type ShowcaseContent = {
  /** Product codes shown beside the hero photograph. */
  featured: string[];
  /** Product codes shown in the popular row. */
  popular: string[];
  /** Category slugs shown in the browse block. */
  categories: string[];
};

async function readContent<T>(key: string, fallback: T): Promise<T> {
  const record = await prisma.siteContent.findUnique({ where: { key } });

  if (!record || record.value === null || typeof record.value !== "object") {
    return fallback;
  }

  return { ...fallback, ...(record.value as Partial<T>) } as T;
}

const heroDefault: HeroContent = {
  eyebrow: "Architectural and home hardware",
  headline: "Hardware that completes the space",
  body: "Explore architectural hardware designed for modern homes, commercial spaces and interior projects.",
  primaryLabel: "Explore Products",
  primaryHref: "/products",
  secondaryLabel: "Start an Inquiry",
  secondaryHref: "/inquiry",
  image: "house-brick-modern",
  hotspots: [],
};

const reasonsDefault: ReasonsContent = {
  eyebrow: "Why Malhotra Enterprise",
  headline: "Specified once, supplied properly",
  items: [],
};

const inspirationDefault: InspirationContent = {
  eyebrow: "Architectural inspiration",
  headline: "Where our hardware is put to work",
  images: [],
};

const contactDefault: ContactContent = {
  phone: "+977 1 4000000",
  whatsapp: "9779800000000",
  email: "inquiries@malhotraenterprise.com.np",
  addressLines: ["New Road", "Kathmandu 44600", "Nepal"],
  hours: [],
};

const showcaseDefault: ShowcaseContent = {
  featured: [],
  popular: [],
  categories: [],
};

const aboutDefault: AboutContent = {
  headline: "Hardware for the way Kathmandu builds",
  paragraphs: [],
  image: "house-hillside",
};

export const contentDefaults = {
  hero: heroDefault,
  showcase: showcaseDefault,
  reasons: reasonsDefault,
  inspiration: inspirationDefault,
  contact: contactDefault,
  about: aboutDefault,
};

export const getHeroContent = () => readContent("home.hero", contentDefaults.hero);
export const getShowcaseContent = () =>
  readContent("home.showcase", contentDefaults.showcase);
export const getReasonsContent = () =>
  readContent("home.reasons", contentDefaults.reasons);
export const getInspirationContent = () =>
  readContent("home.inspiration", contentDefaults.inspiration);
export const getContactContent = () =>
  readContent("company.contact", contentDefaults.contact);
export const getAboutContent = () => readContent("company.about", contentDefaults.about);
