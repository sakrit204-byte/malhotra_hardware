import "server-only";

/**
 * Validation for the files a customer attaches to an inquiry.
 *
 * The declared type on an upload is a claim made by the browser, and the file
 * extension is a claim made by whoever named the file. Neither is trusted. Each
 * file is checked against the bytes it actually starts with, so a script
 * renamed to `drawing.pdf` is rejected before it is ever written to disk.
 */

import {
  acceptedDescription,
  MAX_FILE_BYTES,
  MAX_FILES,
  MAX_TOTAL_BYTES,
} from "@/lib/attachments";

type Signature = { mimeType: string; label: string; test: (bytes: Uint8Array) => boolean };

const startsWith = (bytes: Uint8Array, prefix: number[]): boolean =>
  prefix.every((byte, index) => bytes[index] === byte);

const signatures: Signature[] = [
  {
    mimeType: "application/pdf",
    label: "PDF",
    test: (bytes) => startsWith(bytes, [0x25, 0x50, 0x44, 0x46]),
  },
  {
    mimeType: "image/jpeg",
    label: "JPEG image",
    test: (bytes) => startsWith(bytes, [0xff, 0xd8, 0xff]),
  },
  {
    mimeType: "image/png",
    label: "PNG image",
    test: (bytes) => startsWith(bytes, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
  },
  {
    mimeType: "image/webp",
    label: "WebP image",
    // RIFF at offset zero, WEBP at offset eight.
    test: (bytes) =>
      startsWith(bytes, [0x52, 0x49, 0x46, 0x46]) &&
      bytes[8] === 0x57 &&
      bytes[9] === 0x45 &&
      bytes[10] === 0x42 &&
      bytes[11] === 0x50,
  },
];

export const acceptedTypes = signatures.map((signature) => signature.mimeType);

export type ValidatedFile = {
  fileName: string;
  mimeType: string;
  content: Buffer;
};

export type AttachmentValidation = {
  files: ValidatedFile[];
  errors: string[];
};

const FORBIDDEN_IN_NAME = '<>:"|?*';

/**
 * Reduces a name to something safe to store and to show.
 *
 * Directory information, control characters and the characters a file system
 * refuses are removed, because a name is a label and never a path. Everything
 * else the customer typed is left alone: a file name is their content rather
 * than our copy, and quietly rewriting it would make their own attachment hard
 * to recognise in the list.
 */
function safeName(name: string): string {
  const withoutDirectories = name.split("/").pop()?.split("\\").pop() ?? "attachment";

  const cleaned = Array.from(withoutDirectories)
    .filter((character) => {
      const code = character.codePointAt(0) ?? 0;
      if (code < 0x20 || code === 0x7f) return false;
      return !FORBIDDEN_IN_NAME.includes(character);
    })
    .join("")
    .trim();

  return cleaned.slice(0, 120) || "attachment";
}

export async function validateAttachments(
  uploads: File[],
): Promise<AttachmentValidation> {
  const files: ValidatedFile[] = [];
  const errors: string[] = [];

  const present = uploads.filter((file) => file && file.size > 0);

  if (present.length === 0) return { files, errors };

  if (present.length > MAX_FILES) {
    errors.push(`Attach at most ${MAX_FILES} files. Send the rest in your reply.`);
    return { files, errors };
  }

  let total = 0;

  for (const upload of present) {
    const name = safeName(upload.name);

    if (upload.size > MAX_FILE_BYTES) {
      errors.push(`${name} is larger than 10 MB. Please send a smaller version.`);
      continue;
    }

    total += upload.size;

    if (total > MAX_TOTAL_BYTES) {
      errors.push("The attachments come to more than 25 MB in total.");
      break;
    }

    const content = Buffer.from(await upload.arrayBuffer());
    const head = new Uint8Array(content.subarray(0, 16));
    const match = signatures.find((signature) => signature.test(head));

    if (!match) {
      errors.push(`${name} is not a file type we accept. ${acceptedDescription}.`);
      continue;
    }

    files.push({ fileName: name, mimeType: match.mimeType, content });
  }

  return { files, errors };
}
