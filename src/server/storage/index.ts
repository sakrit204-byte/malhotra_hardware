import "server-only";

import { randomUUID } from "node:crypto";
import { mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import path from "node:path";

import { env } from "@/server/env";

/**
 * File storage.
 *
 * Two areas with different rules:
 *
 * - **Public** holds product photography. It is served straight from the web
 *   server and optimised by the framework.
 * - **Private** holds everything that belongs to one inquiry: the drawings a
 *   customer attached and the summaries we generate. Nothing here is ever
 *   inside a directory the web server will serve. It reaches a browser only
 *   through a route that has already checked who is asking.
 *
 * Names are generated, never taken from the upload. A file called
 * `../../.env` cannot be written anywhere, because the original name is only
 * ever kept in the database as a label.
 */

// Both roots are runtime directories, not bundled assets, so there is nothing
// for the bundler to trace into them. The ignore comments say so explicitly
// rather than leaving a warning on every build.
const privateRoot = path.resolve(
  /* turbopackIgnore: true */ process.cwd(),
  env.STORAGE_PRIVATE_DIR,
);
const publicRoot = path.resolve(
  /* turbopackIgnore: true */ process.cwd(),
  env.STORAGE_PUBLIC_DIR,
);

export type StoredFile = {
  /** Path relative to the private root, safe to keep in the database. */
  storagePath: string;
  fileName: string;
  mimeType: string;
  fileSize: number;
};

/** Keeps a resolved path inside its root, whatever it was built from. */
function resolveWithin(root: string, relative: string): string {
  const resolved = path.resolve(root, relative);
  const withSeparator = root.endsWith(path.sep) ? root : root + path.sep;

  if (resolved !== root && !resolved.startsWith(withSeparator)) {
    throw new Error("Refused a storage path that points outside its root");
  }

  return resolved;
}

function extensionFor(fileName: string, mimeType: string): string {
  const fromName = path.extname(fileName).toLowerCase();

  if (/^\.[a-z0-9]{1,6}$/.test(fromName)) return fromName;

  const fromType: Record<string, string> = {
    "application/pdf": ".pdf",
    "image/jpeg": ".jpg",
    "image/png": ".png",
    "image/webp": ".webp",
    "image/heic": ".heic",
  };

  return fromType[mimeType] ?? ".bin";
}

/**
 * Writes a file into the private area under a generated name.
 * `folder` groups files, normally by inquiry, and is sanitised before use.
 */
export async function savePrivateFile(input: {
  folder: string;
  fileName: string;
  mimeType: string;
  content: Buffer;
}): Promise<StoredFile> {
  const folder = input.folder.replace(/[^a-zA-Z0-9_]/g, "").slice(0, 64) || "misc";
  const storedName = `${randomUUID()}${extensionFor(input.fileName, input.mimeType)}`;
  const relative = path.posix.join(folder, storedName);

  const target = resolveWithin(privateRoot, relative);
  await mkdir(path.dirname(target), { recursive: true });
  await writeFile(target, input.content);

  return {
    storagePath: relative,
    fileName: input.fileName,
    mimeType: input.mimeType,
    fileSize: input.content.byteLength,
  };
}

export async function readPrivateFile(storagePath: string): Promise<Buffer> {
  return readFile(resolveWithin(privateRoot, storagePath));
}

export async function deletePrivateFile(storagePath: string): Promise<void> {
  await unlink(resolveWithin(privateRoot, storagePath)).catch(() => undefined);
}

/*
  The largest slot any photograph is drawn into is a little under 1500 pixels
  wide, so anything past 2000 is weight nobody sees: it costs the optimiser a
  decode of every pixel on every size it produces, and it costs the disk. A
  photograph straight off a phone is routinely four times that.

  Only the publicly served product imagery is touched. A file a customer
  attached to an inquiry is evidence and is stored exactly as it arrived.
*/
const MAX_IMAGE_EDGE = 2000;
const IMAGE_QUALITY = 80;

async function shrinkIfPhotograph(content: Buffer, mimeType: string): Promise<Buffer> {
  if (!/^image\/(jpeg|png|webp)$/.test(mimeType)) return content;

  try {
    const { default: sharp } = await import("sharp");
    const pipeline = sharp(content, { failOn: "none" })
      .rotate()
      .resize({
        width: MAX_IMAGE_EDGE,
        height: MAX_IMAGE_EDGE,
        fit: "inside",
        withoutEnlargement: true,
      });

    const shrunk =
      mimeType === "image/png"
        ? await pipeline.png({ compressionLevel: 9 }).toBuffer()
        : mimeType === "image/webp"
          ? await pipeline.webp({ quality: IMAGE_QUALITY }).toBuffer()
          : await pipeline
              .jpeg({ quality: IMAGE_QUALITY, mozjpeg: true, progressive: true })
              .toBuffer();

    // Never store a file that came out bigger than the one that arrived.
    return shrunk.length < content.length ? shrunk : content;
  } catch {
    // A file sharp cannot read is stored as it arrived. Refusing an upload
    // over a resize would be the wrong trade.
    return content;
  }
}

/** Writes a file into the publicly served uploads area, for product imagery. */
export async function savePublicFile(input: {
  folder: string;
  fileName: string;
  mimeType: string;
  content: Buffer;
}): Promise<{ url: string; fileSize: number }> {
  const folder = input.folder.replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 64) || "misc";
  const storedName = `${randomUUID()}${extensionFor(input.fileName, input.mimeType)}`;
  const relative = path.posix.join(folder, storedName);

  const content = await shrinkIfPhotograph(input.content, input.mimeType);

  const target = resolveWithin(publicRoot, relative);
  await mkdir(path.dirname(target), { recursive: true });
  await writeFile(target, content);

  return { url: `/uploads/${relative}`, fileSize: content.byteLength };
}

/**
 * Removes a file from the publicly served uploads area.
 *
 * Takes the url that was stored on the row, not a path, so a caller cannot
 * reach outside the uploads directory by construction. A file that has already
 * gone is not an error: the point is that it is not there afterwards.
 */
export async function deletePublicFile(url: string): Promise<void> {
  if (!url.startsWith("/uploads/")) return;

  const relative = url.slice("/uploads/".length);
  if (relative.length === 0) return;

  await unlink(resolveWithin(publicRoot, relative)).catch(() => undefined);
}
