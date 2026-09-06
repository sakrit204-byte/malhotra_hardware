import { z } from "zod";

/**
 * Account forms.
 *
 * Every message here is written to be read by a customer who is already
 * slightly annoyed, so each one says what to do rather than what went wrong.
 */

export const MIN_PASSWORD_LENGTH = 10;

const email = z
  .string()
  .trim()
  .toLowerCase()
  .min(1, "Enter your email address.")
  .max(200)
  .pipe(z.email("That email address does not look right. Please check it."));

const password = z
  .string()
  .min(
    MIN_PASSWORD_LENGTH,
    `Use at least ${MIN_PASSWORD_LENGTH} characters. A short phrase you can remember works well.`,
  )
  .max(200, "That password is longer than we can store.");

export const registerSchema = z
  .object({
    fullName: z
      .string()
      .trim()
      .min(2, "Enter your name.")
      .max(120, "That name is longer than we can store."),
    email,
    phone: z
      .string()
      .trim()
      .max(40)
      .optional()
      .transform((value) => (value && value.length > 0 ? value : undefined)),
    companyName: z
      .string()
      .trim()
      .max(160)
      .optional()
      .transform((value) => (value && value.length > 0 ? value : undefined)),
    password,
  })
  .superRefine((values, context) => {
    const local = values.email.split("@")[0];
    const lowered = values.password.toLowerCase();

    // A password that is just the address is the single most common mistake.
    if (local && local.length > 2 && lowered.includes(local.toLowerCase())) {
      context.addIssue({
        code: "custom",
        path: ["password"],
        message: "Choose a password that does not contain your email address.",
      });
    }

    if (/^\d+$/.test(values.password)) {
      context.addIssue({
        code: "custom",
        path: ["password"],
        message: "Use letters as well as numbers.",
      });
    }
  });

export type RegisterValues = z.infer<typeof registerSchema>;

export const loginSchema = z.object({
  email,
  // Deliberately not the strict rule: an existing password must be accepted
  // whatever it looks like, and telling someone their password is too short
  // while they are signing in reveals nothing useful and helps nobody.
  password: z.string().min(1, "Enter your password.").max(200),
});

export type LoginValues = z.infer<typeof loginSchema>;

export const requestResetSchema = z.object({ email });

export const resetPasswordSchema = z
  .object({
    token: z.string().min(20).max(200),
    password,
    confirmPassword: z.string(),
  })
  .refine((values) => values.password === values.confirmPassword, {
    path: ["confirmPassword"],
    message: "The two passwords do not match.",
  });

export type ResetPasswordValues = z.infer<typeof resetPasswordSchema>;

/**
 * Where to send someone after they sign in.
 *
 * Only a path within this site is ever accepted. An absolute address, a
 * protocol relative address or anything else would let a link sign a customer
 * in and then hand them straight to somebody else's page.
 */
export function safeRedirect(value: string | null | undefined, fallback = "/account/inquiries"): string {
  if (!value) return fallback;
  if (!value.startsWith("/")) return fallback;
  if (value.startsWith("//")) return fallback;
  if (value.includes("\\")) return fallback;

  return value;
}
