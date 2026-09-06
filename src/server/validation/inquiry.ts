import { z } from "zod";

import type { InquiryFieldErrors } from "@/lib/inquiry-form";

/**
 * The inquiry form.
 *
 * Required: a name, an email address, a phone number and a message. Everything
 * else is optional, because a customer who wants a price on four hinges should
 * not have to invent a project name to ask for one.
 */

const trimmed = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .transform((value) => (value.length > 0 ? value : undefined))
    .optional();

export const inquiryFormSchema = z.object({
  fullName: z
    .string()
    .trim()
    .min(2, "Enter your name so our team knows who to reply to.")
    .max(120, "That name is longer than we can store."),

  email: z
    .string()
    .trim()
    .toLowerCase()
    .min(1, "Enter an email address our team can reply to.")
    .max(200)
    .pipe(z.email("That email address does not look right. Please check it.")),

  phone: z
    .string()
    .trim()
    .min(6, "Enter a phone number our team can reach you on.")
    .max(40, "That phone number is longer than we can store.")
    .refine(
      (value) => /^[0-9+()\s.]+$/.test(value),
      "A phone number can contain digits, spaces, brackets and a leading plus.",
    ),

  message: z
    .string()
    .trim()
    .min(10, "Tell us a little about what you need, so we can answer properly.")
    .max(4000, "That message is longer than we can store. Please shorten it."),

  companyName: trimmed(160),
  projectName: trimmed(160),
  projectLocation: trimmed(160),
  additionalRequirements: trimmed(2000),
});

export type InquiryFormValues = z.infer<typeof inquiryFormSchema>;

/** Reads the form fields out of a submission without touching the files. */
export function readInquiryForm(formData: FormData) {
  return inquiryFormSchema.safeParse({
    fullName: formData.get("fullName") ?? "",
    email: formData.get("email") ?? "",
    phone: formData.get("phone") ?? "",
    message: formData.get("message") ?? "",
    companyName: formData.get("companyName") ?? "",
    projectName: formData.get("projectName") ?? "",
    projectLocation: formData.get("projectLocation") ?? "",
    additionalRequirements: formData.get("additionalRequirements") ?? "",
  });
}

/** Turns a Zod failure into one message per field, ready for the form. */
export function fieldErrorsFrom(error: z.ZodError): InquiryFieldErrors {
  const errors: InquiryFieldErrors = {};

  for (const issue of error.issues) {
    const field = issue.path[0];
    if (typeof field === "string" && !(field in errors)) {
      errors[field as keyof InquiryFieldErrors] = issue.message;
    }
  }

  return errors;
}
