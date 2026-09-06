/**
 * Downloads the curated catalogue photography into local storage.
 *
 * Images are stored in the project rather than linked from a remote host, so
 * the catalogue keeps working offline, image optimisation happens locally, and
 * an administrator can replace any file through the admin panel later.
 *
 * Run with: npm run images:fetch
 */

import { mkdir, writeFile, access } from "node:fs/promises";
import path from "node:path";

import sharp from "sharp";

import { curatedPhotos, type CuratedPhoto } from "../prisma/seed/media/photos";

const HOST = "https://images.unsplash.com";
const OUTPUT_DIR = path.join(process.cwd(), "public", "uploads", "catalogue");
const MANIFEST = path.join(OUTPUT_DIR, "attribution.json");

/** Wide enough for a full bleed hero on a large display, small enough to ship. */
const WIDTHS: Record<CuratedPhoto["kind"], number> = {
  product: 1400,
  architecture: 2000,
};

async function exists(file: string): Promise<boolean> {
  try {
    await access(file);
    return true;
  } catch {
    return false;
  }
}

async function download(photo: CuratedPhoto, force: boolean) {
  const target = path.join(OUTPUT_DIR, `${photo.key}.jpg`);

  if (!force && (await exists(target))) {
    return { key: photo.key, skipped: true, width: 0, height: 0 };
  }

  const width = WIDTHS[photo.kind];
  const url = `${HOST}/${photo.source}?auto=format&fit=crop&w=${width}&q=80&fm=jpg`;

  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`${photo.key}: download failed with status ${response.status}`);
  }

  const original = Buffer.from(await response.arrayBuffer());

  // Re encode locally so every file has predictable dimensions, a consistent
  // quality setting and no upstream metadata.
  const image = sharp(original).jpeg({ quality: 82, progressive: true });
  const output = await image.toBuffer({ resolveWithObject: true });

  await writeFile(target, output.data);

  return {
    key: photo.key,
    skipped: false,
    width: output.info.width,
    height: output.info.height,
  };
}

async function main() {
  const force = process.argv.includes("--force");

  await mkdir(OUTPUT_DIR, { recursive: true });

  console.log(`Fetching ${curatedPhotos.length} photographs into public/uploads/catalogue`);

  const results: Array<Awaited<ReturnType<typeof download>>> = [];
  const failures: string[] = [];

  // Sequential with a short pause. This runs once during setup and there is no
  // reason to hammer the image host.
  for (const photo of curatedPhotos) {
    try {
      const result = await download(photo, force);
      results.push(result);
      process.stdout.write(result.skipped ? "." : "+");
      if (!result.skipped) {
        await new Promise((resolve) => setTimeout(resolve, 120));
      }
    } catch (error) {
      failures.push(`${photo.key}: ${(error as Error).message}`);
      process.stdout.write("x");
    }
  }

  process.stdout.write("\n");

  const manifest = {
    licence:
      "Photographs are used under the Unsplash licence, which allows free commercial use without permission. Credit is retained here and shown in the interface where photography is presented on its own.",
    generatedAt: new Date().toISOString(),
    photos: curatedPhotos.map((photo) => {
      const result = results.find((item) => item.key === photo.key);
      return {
        key: photo.key,
        file: `/uploads/catalogue/${photo.key}.jpg`,
        alt: photo.alt,
        kind: photo.kind,
        photographer: photo.photographer,
        photographerUrl: `https://unsplash.com/@${photo.photographerHandle}`,
        sourceUrl: `${HOST}/${photo.source}`,
        width: result?.width ?? null,
        height: result?.height ?? null,
      };
    }),
  };

  await writeFile(MANIFEST, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");

  const downloaded = results.filter((result) => !result.skipped).length;
  const skipped = results.filter((result) => result.skipped).length;

  console.log(
    `Downloaded ${downloaded}, already present ${skipped}, failed ${failures.length}.`,
  );
  console.log(`Attribution written to ${path.relative(process.cwd(), MANIFEST)}`);

  if (failures.length > 0) {
    console.error("\nFailures:");
    for (const failure of failures) console.error(`  ${failure}`);
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
