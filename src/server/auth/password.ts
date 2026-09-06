import { randomBytes, timingSafeEqual } from "node:crypto";

import { argon2idAsync } from "@noble/hashes/argon2.js";

/**
 * Password hashing.
 *
 * Argon2id with the parameters recommended by OWASP: 19 MiB of memory, two
 * passes, one lane. Hashes are stored in the standard PHC string format, so the
 * parameters travel with the hash and can be raised later without invalidating
 * anyone's password.
 *
 * Nothing here ever logs or returns a plain password.
 */

const MEMORY_KIB = 19456;
const TIME_COST = 2;
const PARALLELISM = 1;
const KEY_LENGTH = 32;
const SALT_LENGTH = 16;
const VERSION = 19;

function toBase64(bytes: Uint8Array): string {
  return Buffer.from(bytes).toString("base64").replace(/=+$/, "");
}

function fromBase64(value: string): Buffer {
  return Buffer.from(value, "base64");
}

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(SALT_LENGTH);

  const hash = await argon2idAsync(password.normalize("NFKC"), salt, {
    m: MEMORY_KIB,
    t: TIME_COST,
    p: PARALLELISM,
    dkLen: KEY_LENGTH,
  });

  return [
    "",
    "argon2id",
    `v=${VERSION}`,
    `m=${MEMORY_KIB},t=${TIME_COST},p=${PARALLELISM}`,
    toBase64(salt),
    toBase64(hash),
  ].join("$");
}

/**
 * Verifies a password against a stored hash. Returns false rather than throwing
 * on a malformed hash so that a corrupted row cannot become a login error the
 * caller has to special case.
 */
export async function verifyPassword(
  password: string,
  stored: string,
): Promise<boolean> {
  try {
    const parts = stored.split("$");
    if (parts.length !== 6 || parts[1] !== "argon2id") return false;

    const params = Object.fromEntries(
      parts[3].split(",").map((pair) => {
        const [key, value] = pair.split("=");
        return [key, Number(value)];
      }),
    );

    const salt = fromBase64(parts[4]);
    const expected = fromBase64(parts[5]);

    const actual = await argon2idAsync(password.normalize("NFKC"), salt, {
      m: params.m,
      t: params.t,
      p: params.p,
      dkLen: expected.length,
    });

    const actualBuffer = Buffer.from(actual);
    if (actualBuffer.length !== expected.length) return false;

    return timingSafeEqual(actualBuffer, expected);
  } catch {
    return false;
  }
}

/** True when a stored hash was made with weaker parameters than we now use. */
export function needsRehash(stored: string): boolean {
  const parts = stored.split("$");
  if (parts.length !== 6 || parts[1] !== "argon2id") return true;

  const params = Object.fromEntries(
    parts[3].split(",").map((pair) => {
      const [key, value] = pair.split("=");
      return [key, Number(value)];
    }),
  );

  return params.m < MEMORY_KIB || params.t < TIME_COST;
}
