import { ArrowRight, MessageCircle, Phone } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

import { ProductCard } from "@/components/catalogue/product-card";
import { CountUp } from "@/components/site/count-up";
import { Hero } from "@/components/site/hero";
import { WhatsappLink } from "@/components/site/whatsapp-link";
import { Button } from "@/components/ui/button";
import { Container, Section } from "@/components/ui/container";
import { Note, Plate, TitleBlock } from "@/components/ui/drawing";
import { imageUrl } from "@/lib/catalogue";
import { cn } from "@/lib/cn";
import {
  getCatalogueSummary,
  listCategoriesInOrder,
  listCategoryIndex,
  listFeaturedCategories,
  listProductsByCodes,
  listProductsByFlag,
  listProductsInOrder,
} from "@/server/repositories/catalogue";
import {
  getAboutContent,
  getContactContent,
  getHeroContent,
  getInspirationContent,
  getReasonsContent,
  getShowcaseContent,
} from "@/server/repositories/content";

/**
 * The home page, laid out as a set of drawing sheets.
 *
 * Six sheets, each doing one job: the title block, where to start, what people
 * buy, why us, where it ends up, and how to ask. Each carries its subject
 * lettered on a rule at the head, and the compositions inside them are
 * deliberately uneven so that no two sheets are scanned the same way.
 */

export default async function HomePage() {
  const [hero, about, showcase, reasons, inspiration, contact, summary, index] =
    await Promise.all([
      getHeroContent(),
      getAboutContent(),
      getShowcaseContent(),
      getReasonsContent(),
      getInspirationContent(),
      getContactContent(),
      getCatalogueSummary(),
      listCategoryIndex(),
    ]);

  /*
    What appears on the home page, and in what order, is arranged in the
    administrator platform. Until somebody has arranged it, the flags on the
    products themselves stand in, so a fresh install still has a home page.
  */
  const [categories, popular, featured, hotspotProducts] = await Promise.all([
    showcase.categories.length > 0
      ? listCategoriesInOrder(showcase.categories).then((rows) => rows.slice(0, 5))
      : listFeaturedCategories(5),
    showcase.popular.length > 0
      ? listProductsInOrder(showcase.popular).then((rows) => rows.slice(0, 8))
      : listProductsByFlag("isPopular", 8),
    showcase.featured.length > 0
      ? listProductsInOrder(showcase.featured).then((rows) => rows.slice(0, 3))
      : listProductsByFlag("isFeatured", 3),

    /*
      Each point marked on the photograph names a product by its code. This
      only needs the hero, which is already in hand, so it is fetched beside
      the showcase rather than waiting for it: one round trip instead of two.
    */
    listProductsByCodes(hero.hotspots.map((hotspot) => hotspot.code)),
  ]);

  const heroImage = imageUrl(hero.image);

  // The piece of hardware shown in front of the building. Any published product
  // with a photograph will do, so the hero keeps working after the catalogue is
  // rearranged.
  const heroProduct = [...featured, ...popular].find((item) => item.images.length > 0);

  const heroDetail = heroProduct
    ? {
        image: heroProduct.images[0].url,
        alt: heroProduct.images[0].alt,
        name: heroProduct.name,
        code: heroProduct.code,
        finish: heroProduct.finish?.name ?? null,
        href: `/products/${heroProduct.slug}`,
      }
    : null;

  // Any point whose product is missing or unpublished is simply not drawn.
  const hotspotsByCode = new Map(
    hotspotProducts.map((product) => [product.code, product]),
  );

  const hotspots = hero.hotspots.flatMap((hotspot) => {
    const product = hotspotsByCode.get(hotspot.code);
    if (!product) return [];

    return [
      {
        x: hotspot.x,
        y: hotspot.y,
        label: hotspot.label,
        name: product.name,
        code: product.code,
        finish: product.finish?.name ?? null,
        href: `/products/${product.slug}`,
        image: product.images[0]?.url ?? null,
        imageAlt: product.images[0]?.alt ?? product.name,
      },
    ];
  });

  const [lead] = categories;
  // However many photographs an administrator chose, up to the six the block
  // is designed to hold. The first runs the full width and the rest pair off.
  const inspirationImages = inspiration.images.slice(0, 6);
  const [leadImage, ...restImages] = inspirationImages;

  return (
    <>
      <Hero
        content={hero}
        image={heroImage}
        detail={heroDetail}
        stats={[
          { value: String(summary.products), label: "products" },
          { value: String(summary.categories), label: "categories" },
          { value: String(summary.finishes), label: "finishes" },
        ]}
        hotspots={hotspots}
      />

      {/* --------------------------------------------------- what we hold */}
      <section aria-label="The range in figures" className="border-b border-line">
        <Container width="wide">
          <dl className="stagger grid grid-cols-2 divide-line lg:grid-cols-4 lg:divide-x">
            {[
              { value: summary.products, label: "products stocked" },
              { value: summary.categories, label: "categories" },
              { value: summary.finishes, label: "finishes" },
              { value: summary.brands, label: "brands carried" },
            ].map((figure, position) => (
              <div
                key={figure.label}
                className={cn(
                  "py-10 lg:py-14",
                  position % 2 === 1 && "border-l border-line lg:border-l-0",
                  position > 1 && "border-t border-line lg:border-t-0",
                  // The first figure keeps the page margin so the band starts
                  // on the same line as every other section.
                  position % 2 === 1 && "ps-6 lg:ps-0",
                  position > 0 && "lg:ps-10",
                )}
              >
                <dd className="font-display text-[clamp(3rem,6vw,5.5rem)] leading-[0.85] text-brand">
                  <CountUp value={figure.value} />
                </dd>
                <dt className="note mt-4">{figure.label}</dt>
              </div>
            ))}
          </dl>
        </Container>
      </section>

      {/* ---------------------------------------------- 02  where to start */}
      {lead ? (
        <Section className="sheet">
          <Container width="wide" className="relative">
            <TitleBlock
              className="reveal reveal-lead"
              label="Browse the range"
              title="Where to start"
              description="Sixteen categories, arranged the way a door schedule is written: by what the piece does rather than by who made it."
              action={
                <Button asChild variant="quiet">
                  <Link href="/products">
                    All products
                    <ArrowRight className="size-4" aria-hidden="true" />
                  </Link>
                </Button>
              }
            />

            {/*
              The lead category is drawn at twice the size of the others. An
              even grid of identical tiles gives a reader nowhere to look
              first, which is most of what makes a page feel like a catalogue
              sheet rather than a considered one.
            */}
            <ul className="stagger mt-16 grid grid-cols-2 gap-x-5 gap-y-12 lg:grid-cols-4">
              {categories.map((category, index) => {
                const image = imageUrl(category.imageUrl);
                const isLead = index === 0;

                return (
                  <li
                    key={category.id}
                    className={isLead ? "col-span-2 lg:row-span-2" : undefined}
                  >
                    <Link
                      href={`/products?category=${category.slug}`}
                      className="group flex h-full flex-col"
                    >
                      <p className="note mb-3 flex items-baseline justify-between gap-3 border-t border-line pt-2.5">
                        <span>{String(index + 1).padStart(2, "0")}</span>
                        <span className="figure normal-case tracking-normal text-ink-muted">
                          {category._count.productsAsCategory}
                        </span>
                      </p>

                      {/* The lead plate takes its height from the two rows
                          beside it rather than from a ratio, so the block
                          closes cleanly instead of hanging below them. */}
                      <Plate
                        className={cn(
                          "plate-hover",
                          isLead ? "aspect-4/5 lg:aspect-auto lg:flex-1" : "aspect-4/3",
                        )}
                      >
                        {image ? (
                          <Image
                            src={image}
                            alt=""
                            fill
                            sizes={
                              isLead
                                ? "(min-width: 1024px) 45vw, 50vw"
                                : "(min-width: 1024px) 23vw, 50vw"
                            }
                            /* Drift owns the transform here, so the tile
                               answers a hover with its title instead. */
                            className="drift object-cover"
                          />
                        ) : null}
                      </Plate>

                      <h3
                        className={cn(
                          "mt-4 text-ink underline decoration-transparent underline-offset-[6px]",
                          "transition-[transform,color,text-decoration-color] duration-[--duration-settled] ease-[--ease-quiet]",
                          "group-hover:translate-x-1 group-hover:text-brand group-hover:decoration-brand",
                          isLead ? "text-2xl lg:text-[2rem]" : "text-lg",
                        )}
                      >
                        {category.name}
                      </h3>
                    </Link>
                  </li>
                );
              })}
            </ul>

            {/*
              The whole range, lettered. Five photographs is an invitation;
              this is the answer to somebody who already knows what they came
              for and wants to see whether it is stocked.
            */}
            {index.length > 0 ? (
              <div className="reveal mt-16 border-t border-ink pt-4">
                <p className="note">Everything we carry</p>
                <ul className="mt-5 grid gap-x-8 sm:grid-cols-2 lg:grid-cols-4">
                  {index.map((entry) => (
                    <li key={entry.id} className="border-b border-line">
                      <Link
                        href={`/products?category=${entry.slug}`}
                        className="group flex items-baseline justify-between gap-3 py-2.5"
                      >
                        <span className="min-w-0 truncate text-[0.9375rem] text-ink-soft transition-colors group-hover:text-brand">
                          {entry.name}
                        </span>
                        <span className="note shrink-0">
                          {entry._count.productsAsCategory}
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </Container>
        </Section>
      ) : null}

      {/* ------------------------------------------------------ 03  popular */}
      {popular.length > 0 ? (
        <Section tone="sunken" className="sheet">
          <Container width="wide" className="relative">
            <TitleBlock
              className="reveal reveal-lead"
              label="Specified often"
              title="What architects come back for"
              action={
                <Button asChild variant="quiet">
                  <Link href="/products?sort=popular">
                    See more
                    <ArrowRight className="size-4" aria-hidden="true" />
                  </Link>
                </Button>
              }
            />

            <div className="stagger mt-16 grid grid-cols-2 gap-x-5 gap-y-14 lg:grid-cols-4">
              {popular.map((product) => (
                <ProductCard
                  key={product.id}
                  product={product}
                />
              ))}
            </div>
          </Container>
        </Section>
      ) : null}

      {/* --------------------------------------------------- who we are */}
      {about.paragraphs.length > 0 ? (
        <Section className="sheet">
          <Container width="wide" className="relative">
            <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-20">
              <div className="reveal">
                <p className="note border-t border-ink pt-3">The company</p>
                <h2 className="mt-8 max-w-[14ch] text-title text-ink">
                  {about.headline}
                </h2>
                <p className="mt-8 max-w-xl text-[1.125rem] leading-relaxed text-ink-soft">
                  {about.paragraphs[0]}
                </p>

                <div className="mt-10">
                  <Button asChild size="lg" variant="secondary">
                    <Link href="/about">
                      More about us
                      <ArrowRight className="size-4" aria-hidden="true" />
                    </Link>
                  </Button>
                </div>
              </div>

              <div className="reveal">
                <Plate className="aspect-4/3 lg:aspect-square">
                  <Image
                    src={imageUrl(about.image) ?? ""}
                    alt=""
                    fill
                    sizes="(min-width: 1024px) 45vw, 100vw"
                    className="drift object-cover"
                  />
                </Plate>
              </div>
            </div>
          </Container>
        </Section>
      ) : null}

      {/* ------------------------------------------------------ 04  reasons */}
      {reasons.items.length > 0 ? (
        <Section tone="brand" className="sheet">
          <Container width="wide" className="relative">
            <TitleBlock
              className="reveal reveal-lead"
              label={reasons.eyebrow}
              title={reasons.headline}
              tone="inverse"
            />

            {/*
              Four boxes rather than four rows. Each one carries the claim, the
              sentence behind it and the hard fact underneath, so a reader who
              stops at one box has still learned something whole.

              The hover is the point of the block: the ground deepens, the rule
              draws itself across, the numeral lifts and the fact slides up into
              place. It is one movement made of four, which is what makes it
              read as deliberate rather than as four separate effects.
            */}
            <dl className="stagger mt-16 grid gap-px bg-white/20 sm:grid-cols-2 xl:grid-cols-4">
              {reasons.items.map((item, index) => (
                <div
                  key={item.title}
                  className="group relative flex flex-col bg-brand p-8 transition-colors duration-500 ease-[--ease-quiet] hover:bg-brand-deep lg:p-10"
                >
                  <p className="font-display text-[3.25rem] leading-[0.8] text-white/40 transition-[transform,color] duration-500 ease-[--ease-quiet] group-hover:-translate-y-1 group-hover:text-white/85">
                    {String(index + 1).padStart(2, "0")}
                  </p>

                  <dt className="mt-8 text-[1.375rem] leading-snug text-white">
                    {item.title}
                  </dt>

                  <dd className="mt-4 flex-1 leading-relaxed text-white/75 transition-colors duration-500 ease-[--ease-quiet] group-hover:text-white/95">
                    {item.body}
                  </dd>

                  {item.note ? (
                    <div className="mt-8">
                      {/* The rule draws from nothing to full width, which is
                          what makes the fact underneath feel revealed rather
                          than merely recoloured. */}
                      <span
                        className="block h-px w-8 origin-left bg-white/50 transition-[width,background-color] duration-500 ease-[--ease-quiet] group-hover:w-full group-hover:bg-white/80"
                        aria-hidden="true"
                      />
                      <p className="note mt-3 text-white/55 transition-[transform,color] duration-500 ease-[--ease-quiet] group-hover:translate-x-1 group-hover:text-white">
                        {item.note}
                      </p>
                    </div>
                  ) : null}
                </div>
              ))}
            </dl>
          </Container>
        </Section>
      ) : null}

      {/* -------------------------------------------------- 05  inspiration */}
      {leadImage ? (
        <Section className="sheet overflow-hidden">
          <Container width="wide" className="relative">
            <TitleBlock
              className="reveal reveal-lead"
              label={inspiration.eyebrow}
              title={inspiration.headline}
            />
          </Container>

          {/*
            The lead photograph runs off both edges of the page. Nothing else on
            the site does, which is what makes this sheet read as the place the
            hardware is actually used rather than another row of tiles.
          */}
          <div className="reveal mt-16">
            <div className="relative aspect-16/9 overflow-hidden bg-surface-sunken sm:aspect-21/9">
              <Image
                src={imageUrl(leadImage) ?? ""}
                alt=""
                fill
                sizes="100vw"
                className="drift object-cover"
              />
            </div>

            <Container width="wide">
              <Note className="mt-4">{inspiration.eyebrow}</Note>
            </Container>
          </div>

          {restImages.length > 0 ? (
            <Container width="wide">
              <ul className="stagger mt-12 grid gap-5 sm:grid-cols-2">
                {restImages.map((key) => {
                  const source = imageUrl(key);
                  if (!source) return null;

                  return (
                    <li key={key}>
                      <Plate className="aspect-4/3">
                        <Image
                          src={source}
                          alt=""
                          fill
                          sizes="(min-width: 640px) 47vw, 100vw"
                          className="drift object-cover"
                        />
                      </Plate>
                    </li>
                  );
                })}
              </ul>
            </Container>
          ) : null}
        </Section>
      ) : null}

      {/* ------------------------------------------ 06  inquiry and contact */}
      <Section tone="sunken" className="sheet">
        <Container width="wide" className="relative">
          <TitleBlock
            className="reveal reveal-lead"
            label="Send an inquiry"
            title="Tell us what the project needs"
          />

          <div className="mt-16 grid gap-14 lg:grid-cols-[1.15fr_1fr] lg:gap-24">
            <div className="reveal">
              <p className="max-w-xl text-[1.0625rem] leading-relaxed text-ink-soft">
                Add what you are interested in, tell us the quantities, and our team comes
                back with availability, lead times and a firm price. No account needed.
              </p>
              <div className="mt-10 flex flex-wrap gap-3">
                <Button asChild size="lg">
                  <Link href="/inquiry">Start an inquiry</Link>
                </Button>
                <Button asChild size="lg" variant="secondary">
                  <Link href="/products">Browse products</Link>
                </Button>
              </div>
            </div>

            <div className="reveal border-t border-line pt-10 lg:border-l lg:border-t-0 lg:pl-24 lg:pt-0">
              <p className="note">Or talk to us</p>
              <ul className="mt-6 space-y-5">
                <li className="flex items-start gap-3">
                  <Phone className="mt-1 size-4 shrink-0 text-ink-muted" aria-hidden="true" />
                  <a
                    href={`tel:${contact.phone.replace(/\s+/g, "")}`}
                    className="figure text-ink underline decoration-line-strong underline-offset-4 transition-colors hover:decoration-ink"
                  >
                    {contact.phone}
                  </a>
                </li>
                <li className="flex items-start gap-3">
                  <MessageCircle
                    className="mt-1 size-4 shrink-0 text-ink-muted"
                    aria-hidden="true"
                  />
                  <WhatsappLink
                    number={contact.whatsapp}
                    message="Hello Malhotra Enterprise, I would like to ask about your hardware range."
                    className="text-ink underline decoration-line-strong underline-offset-4 transition-colors hover:decoration-ink"
                  >
                    Message us on WhatsApp
                  </WhatsappLink>
                </li>
              </ul>

              <address className="mt-8 space-y-0.5 not-italic text-ink-soft">
                {contact.addressLines.map((line) => (
                  <span key={line} className="block">
                    {line}
                  </span>
                ))}
              </address>
            </div>
          </div>
        </Container>
      </Section>
    </>
  );
}
