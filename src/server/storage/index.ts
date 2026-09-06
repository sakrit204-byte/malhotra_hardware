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

  const target = resolveWithin(publicRoot, relative);
  await mkdir(path.dirname(target), { recursive: true });
  await writeFile(target, input.content);

  return { url: `/uploads/${relative}`, fileSize: input.content.byteLength };
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
