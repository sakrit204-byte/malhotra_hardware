import "dotenv/config";

import { PrismaPg } from "@prisma/adapter-pg";

import { PrismaClient } from "../../src/generated/prisma/client";
import { formatInquiryReference } from "../../src/lib/reference";
import { hashPassword } from "../../src/server/auth/password";
import { curatedPhotos, photoPath, photosByKey } from "./media/photos";
import { demoInquiries, demoUsers, siteContent } from "./data/operations";
import { products, type ProductSeed } from "./data/products";
import {
  applications,
  brands,
  categories,
  finishes,
  materials,
  specificationDefinitions,
  tags,
} from "./data/taxonomy";

/**
 * Seeds a realistic development catalogue.
 *
 * Safe to run repeatedly: it clears the tables it owns first, in an order that
 * respects the foreign keys, then rebuilds everything from the data files.
 */

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL is not set. Copy .env.example to .env first.");
}

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString }),
});

function slugify(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function daysAgo(days: number): Date {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date;
}

function addHours(date: Date, hours: number): Date {
  return new Date(date.getTime() + hours * 60 * 60 * 1000);
}

async function clear() {
  // Ordered so that every child is removed before its parent. Prisma cascades
  // would cover most of this, but being explicit keeps the intent readable.
  await prisma.auditLog.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.emailLog.deleteMany();
  await prisma.inquiryStatusHistory.deleteMany();
  await prisma.inquiryAttachment.deleteMany();
  await prisma.inquiryMessage.deleteMany();
  await prisma.inquiryItem.deleteMany();
  await prisma.verificationToken.deleteMany();
  await prisma.inquiry.deleteMany();
  await prisma.inquirySequence.deleteMany();
  await prisma.session.deleteMany();
  await prisma.rateLimit.deleteMany();
  await prisma.siteContent.deleteMany();
  await prisma.productSpecification.deleteMany();
  await prisma.productDocument.deleteMany();
  await prisma.productImage.deleteMany();
  await prisma.productVariant.deleteMany();
  await prisma.product.deleteMany();
  await prisma.specificationDefinition.deleteMany();
  await prisma.tag.deleteMany();
  await prisma.application.deleteMany();
  await prisma.finish.deleteMany();
  await prisma.material.deleteMany();
  await prisma.brand.deleteMany();
  // Children first, because a category points at its own parent.
  await prisma.category.deleteMany({ where: { parentId: { not: null } } });
  await prisma.category.deleteMany();
  await prisma.user.deleteMany();
}

async function seedTaxonomy() {
  const categoryIds = new Map<string, string>();

  for (const category of categories) {
    const created = await prisma.category.create({
      data: {
        name: category.name,
        slug: category.slug,
        description: category.description,
        sortOrder: category.sortOrder,
        isFeatured: category.isFeatured ?? false,
        imageUrl: category.image ? photoPath(category.image) : null,
        imageCredit: category.image
          ? photosByKey.get(category.image)?.photographer
          : null,
        metaTitle: category.name,
        metaDescription: category.description,
      },
    });
    categoryIds.set(category.slug, created.id);

    for (const [index, child] of (category.children ?? []).entries()) {
      const createdChild = await prisma.category.create({
        data: {
          name: child.name,
          slug: child.slug,
          description: child.description ?? null,
          parentId: created.id,
          sortOrder: (index + 1) * 10,
        },
      });
      categoryIds.set(child.slug, createdChild.id);
    }
  }

  const brandIds = new Map<string, string>();
  for (const brand of brands) {
    const created = await prisma.brand.create({ data: brand });
    brandIds.set(brand.slug, created.id);
  }

  const materialIds = new Map<string, string>();
  for (const material of materials) {
    const created = await prisma.material.create({ data: material });
    materialIds.set(material.slug, created.id);
  }

  const finishIds = new Map<string, string>();
  const finishNames = new Map<string, string>();
  for (const finish of finishes) {
    const created = await prisma.finish.create({ data: finish });
    finishIds.set(finish.slug, created.id);
    finishNames.set(finish.slug, finish.name);
  }

  const applicationIds = new Map<string, string>();
  for (const application of applications) {
    const created = await prisma.application.create({ data: application });
    applicationIds.set(application.slug, created.id);
  }

  const tagIds = new Map<string, string>();
  for (const tag of tags) {
    const created = await prisma.tag.create({
      data: { name: tag, slug: slugify(tag) },
    });
    tagIds.set(tag, created.id);
  }

  const definitionIds = new Map<string, string>();
  for (const definition of specificationDefinitions) {
    const created = await prisma.specificationDefinition.create({
      data: {
        key: definition.key,
        label: definition.label,
        unit: "unit" in definition ? definition.unit : null,
        dataType: definition.dataType,
        groupName: definition.groupName,
        options: "options" in definition ? [...definition.options] : [],
        isFilterable: "isFilterable" in definition ? definition.isFilterable : false,
        sortOrder: definition.sortOrder,
      },
    });
    definitionIds.set(definition.key, created.id);
  }

  return {
    categoryIds,
    brandIds,
    materialIds,
    finishIds,
    finishNames,
    applicationIds,
    tagIds,
    definitionIds,
  };
}

type Taxonomy = Awaited<ReturnType<typeof seedTaxonomy>>;

function buildVariants(product: ProductSeed, taxonomy: Taxonomy) {
  const finishSlugs = Array.from(
    new Set([product.finish, ...product.variantFinishes]),
  );
  const sizes = product.variantSizes ?? [];

  const combinations: Array<{ finish: string; size?: string }> = [];

  for (const finish of finishSlugs) {
    if (sizes.length === 0) {
      combinations.push({ finish });
    } else {
      for (const size of sizes) {
        combinations.push({ finish, size });
      }
    }
  }

  // A catalogue variant list stops being useful past a dozen rows. Real
  // combinations beyond this are handled as a note on the inquiry.
  return combinations.slice(0, 12).map((combination, index) => {
    const finishName = taxonomy.finishNames.get(combination.finish) ?? combination.finish;
    const name = combination.size ? `${finishName}, ${combination.size}` : finishName;

    return {
      name,
      code: `${product.code} V${index + 1}`,
      size: combination.size ?? null,
      finishId: taxonomy.finishIds.get(combination.finish) ?? null,
      materialId: taxonomy.materialIds.get(product.material) ?? null,
      availability: product.availability,
      sortOrder: index * 10,
    };
  });
}

async function seedProducts(taxonomy: Taxonomy) {
  const productIdsByCode = new Map<string, string>();
  const publishedAt = new Date();

  for (const [index, product] of products.entries()) {
    const primary = photosByKey.get(product.photo);

    if (!primary) {
      throw new Error(`Product ${product.code} references unknown photo ${product.photo}`);
    }

    const categoryId = taxonomy.categoryIds.get(product.category);
    if (!categoryId) {
      throw new Error(`Product ${product.code} references unknown category ${product.category}`);
    }

    const gallery = [product.photo, ...(product.extraPhotos ?? [])];

    const specifications = Object.entries(product.specs).flatMap(([key, value], order) => {
      const definitionId = taxonomy.definitionIds.get(key);
      if (!definitionId) return [];
      return [{ definitionId, value, sortOrder: order * 10 }];
    });

    const created = await prisma.product.create({
      data: {
        name: product.name,
        slug: slugify(product.name),
        code: product.code,
        categoryId,
        subcategoryId: product.subcategory
          ? (taxonomy.categoryIds.get(product.subcategory) ?? null)
          : null,
        brandId: taxonomy.brandIds.get(product.brand) ?? null,
        materialId: taxonomy.materialIds.get(product.material) ?? null,
        finishId: taxonomy.finishIds.get(product.finish) ?? null,
        applicationId: taxonomy.applicationIds.get(product.application) ?? null,
        shortDescription: product.shortDescription,
        description: product.description,
        dimensions: product.dimensions,
        availability: product.availability,
        isPublished: true,
        publishedAt,
        isFeatured: product.isFeatured ?? false,
        isPopular: product.isPopular ?? false,
        sortOrder: index * 10,
        viewCount: Math.floor(Math.random() * 400),
        metaTitle: product.name,
        metaDescription: product.shortDescription,
        tags: {
          connect: product.tags.flatMap((tag) => {
            const id = taxonomy.tagIds.get(tag);
            return id ? [{ id }] : [];
          }),
        },
        images: {
          create: gallery.flatMap((key, order) => {
            const photo = photosByKey.get(key);
            if (!photo) return [];
            return [
              {
                url: photoPath(key),
                alt: photo.alt,
                credit: photo.photographer,
                sourceUrl: `https://unsplash.com/@${photo.photographerHandle}`,
                isPrimary: order === 0,
                sortOrder: order * 10,
              },
            ];
          }),
        },
        variants: { create: buildVariants(product, taxonomy) },
        specifications: { create: specifications },
      },
    });

    productIdsByCode.set(product.code, created.id);
  }

  return productIdsByCode;
}

async function seedUsers() {
  const userIds = new Map<string, string>();

  for (const user of demoUsers) {
    const created = await prisma.user.create({
      data: {
        email: user.email.toLowerCase(),
        passwordHash: await hashPassword(user.password),
        fullName: user.fullName,
        phone: user.phone,
        companyName: "companyName" in user ? user.companyName : null,
        role: user.role,
        emailVerifiedAt: user.verified ? new Date() : null,
      },
    });
    userIds.set(user.email, created.id);
  }

  return userIds;
}

async function seedInquiries(
  userIds: Map<string, string>,
  productIdsByCode: Map<string, string>,
) {
  const year = new Date().getFullYear();
  let highest = 0;

  for (const inquiry of demoInquiries) {
    const createdAt = daysAgo(inquiry.daysAgo);
    const reference = formatInquiryReference(year, inquiry.sequence);
    highest = Math.max(highest, inquiry.sequence);

    const lastMessage = inquiry.conversation.at(-1);
    const lastActivityAt = lastMessage
      ? addHours(createdAt, lastMessage.hoursAfter)
      : createdAt;

    const items = inquiry.items.flatMap((item) => {
      const productId = productIdsByCode.get(item.code);
      const source = products.find((candidate) => candidate.code === item.code);
      if (!productId || !source) return [];

      return [
        {
          productId,
          productName: source.name,
          productCode: source.code,
          finishLabel: item.finish
            ? (finishes.find((finish) => finish.slug === item.finish)?.name ?? null)
            : null,
          imageUrl: photoPath(source.photo),
          quantity: item.quantity,
          note: item.note ?? null,
        },
      ];
    });


    const created = await prisma.inquiry.create({
      data: {
        reference,
        year,
        sequence: inquiry.sequence,
        userId: inquiry.linkedToCustomer
          ? (userIds.get(inquiry.email) ?? null)
          : null,
        fullName: inquiry.fullName,
        email: inquiry.email,
        phone: inquiry.phone,
        companyName: inquiry.companyName ?? null,
        projectName: inquiry.projectName ?? null,
        projectLocation: inquiry.projectLocation ?? null,
        additionalRequirements: inquiry.additionalRequirements ?? null,
        message: inquiry.message,
        status: inquiry.status,
        assignedManagerId: inquiry.assignTo
          ? (userIds.get(inquiry.assignTo) ?? null)
          : null,
        itemCount: items.length,
        lastActivityAt,
        unreadForManager: inquiry.status === "NEW",
        unreadForCustomer: lastMessage?.from === "MANAGER",
        createdAt,
        updatedAt: lastActivityAt,
        items: { create: items.map((item, order) => ({ ...item, sortOrder: order * 10 })) },
      },
    });

    for (const message of inquiry.conversation) {
      const sentAt = addHours(createdAt, message.hoursAfter);
      const senderId =
        message.from === "MANAGER" && inquiry.assignTo
          ? (userIds.get(inquiry.assignTo) ?? null)
          : inquiry.linkedToCustomer
            ? (userIds.get(inquiry.email) ?? null)
            : null;

      await prisma.inquiryMessage.create({
        data: {
          inquiryId: created.id,
          senderType: message.from,
          senderUserId: senderId,
          senderName:
            message.from === "MANAGER"
              ? (demoUsers.find((user) => user.email === inquiry.assignTo)?.fullName ??
                "Malhotra Enterprise")
              : inquiry.fullName,
          body: message.body,
          createdAt: sentAt,
          readByManagerAt: message.from === "MANAGER" ? sentAt : sentAt,
          readByCustomerAt: message.from === "CUSTOMER" ? sentAt : null,
        },
      });
    }

    await prisma.inquiryStatusHistory.create({
      data: {
        inquiryId: created.id,
        toStatus: "NEW",
        note: "Inquiry received from the website.",
        createdAt,
      },
    });

    if (inquiry.status !== "NEW") {
      await prisma.inquiryStatusHistory.create({
        data: {
          inquiryId: created.id,
          fromStatus: "NEW",
          toStatus: inquiry.status,
          changedById: inquiry.assignTo ? (userIds.get(inquiry.assignTo) ?? null) : null,
          createdAt: lastActivityAt,
        },
      });
    }

    if (inquiry.status === "NEW") {
      await prisma.notification.create({
        data: {
          forRole: "MANAGER",
          type: "INQUIRY_CREATED",
          title: `New inquiry ${reference}`,
          body: `${inquiry.fullName} sent an inquiry with ${items.length} products.`,
          linkPath: `/manager/inquiries/${created.id}`,
          inquiryId: created.id,
          createdAt,
        },
      });
    }
  }

  await prisma.inquirySequence.create({
    data: { year, lastNumber: highest },
  });
}

async function seedContent() {
  for (const entry of siteContent) {
    await prisma.siteContent.create({
      data: {
        key: entry.key,
        description: entry.description,
        value: entry.value,
      },
    });
  }
}

async function main() {
  console.log("Clearing existing data");
  await clear();

  console.log("Seeding taxonomy");
  const taxonomy = await seedTaxonomy();

  console.log("Seeding products");
  const productIdsByCode = await seedProducts(taxonomy);

  console.log("Seeding users");
  const userIds = await seedUsers();

  console.log("Seeding site content");
  await seedContent();

  console.log("Seeding inquiries");
  await seedInquiries(userIds, productIdsByCode);

  const counts = {
    categories: await prisma.category.count(),
    products: await prisma.product.count(),
    variants: await prisma.productVariant.count(),
    images: await prisma.productImage.count(),
    specifications: await prisma.productSpecification.count(),
    users: await prisma.user.count(),
    inquiries: await prisma.inquiry.count(),
    messages: await prisma.inquiryMessage.count(),
    photographs: curatedPhotos.length,
  };

  console.log("\nSeed complete");
  for (const [label, value] of Object.entries(counts)) {
    console.log(`  ${label.padEnd(16)} ${value}`);
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
