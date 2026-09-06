import { z } from "zod";

/**
 * Environment access happens here and nowhere else. Every value is validated at
 * first import so that a misconfigured deployment fails immediately and loudly
 * rather than halfway through a customer inquiry.
 *
 * This module is server only. Nothing here is ever bundled into client code.
 */

const booleanFromString = z
  .enum(["true", "false", "1", "0", ""])
  .transform((value) => value === "true" || value === "1");

const schema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),

  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),

  APP_URL: z.url().default("http://localhost:3000"),

  SESSION_SECRET: z
    .string()
    .min(32, "SESSION_SECRET must be at least 32 characters"),

  MAIL_DRIVER: z.enum(["smtp", "console"]).default("smtp"),
  MAIL_HOST: z.string().default("localhost"),
  MAIL_PORT: z.coerce.number().int().positive().default(1025),
  MAIL_USER: z.string().optional().default(""),
  MAIL_PASSWORD: z.string().optional().default(""),
  MAIL_SECURE: booleanFromString.default(false),
  MAIL_FROM_NAME: z.string().default("Malhotra Enterprise"),
  MAIL_FROM_ADDRESS: z.email(),
  MAIL_MANAGER_NOTIFICATIONS: z.string().default(""),

  STORAGE_DRIVER: z.enum(["local", "s3"]).default("local"),
  STORAGE_PUBLIC_DIR: z.string().default("./public/uploads"),
  STORAGE_PRIVATE_DIR: z.string().default("./storage/private"),

  FEATURE_ATTACH_SUMMARY_PDF: booleanFromString.default(true),
});

function load() {
  const parsed = schema.safeParse(process.env);

  if (!parsed.success) {
    const detail = parsed.error.issues
      .map((issue) => `  ${issue.path.join(".")}: ${issue.message}`)
      .join("\n");

    throw new Error(
      `Environment configuration is invalid.\n${detail}\n\nCopy .env.example to .env and fill in the missing values.`,
    );
  }

  return parsed.data;
}

export const env = load();

export const isProduction = env.NODE_ENV === "production";
export const isDevelopment = env.NODE_ENV === "development";

/** Addresses that receive a copy of every new inquiry notification. */
export const managerNotificationAddresses = env.MAIL_MANAGER_NOTIFICATIONS.split(",")
  .map((address) => address.trim())
  .filter((address) => address.length > 0);
