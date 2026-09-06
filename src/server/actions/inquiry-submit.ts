"use server";

import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";

import {
  type InquiryFieldErrors,
  type InquiryFormState,
  INQUIRY_FIELD_NAMES,
} from "@/lib/inquiry-form";
import { getSession } from "@/server/auth/session";
import { env } from "@/server/env";
import { validateAttachments } from "@/server/inquiry/attachments";
import { clearBasket, readBasket, writeBasket } from "@/server/inquiry/basket";
import { resolveBasket, toBasketItems } from "@/server/inquiry/resolve";
import { RECEIPT_COOKIE } from "@/server/inquiry/receipt";
import { checkRateLimits, clientAddress } from "@/server/rate-limit";
import { createInquiry } from "@/server/services/inquiry";
import { fieldErrorsFrom, readInquiryForm } from "@/server/validation/inquiry";

/**
 * Submitting the inquiry.
 *
 * The order of work matters and is deliberate:
 *
 * 1. Rate limit, before any expensive work is done on an abusive request.
 * 2. Validate the form fields.
 * 3. Validate the attachments against their actual bytes.
 * 4. Resolve the basket against the database, so a withdrawn product cannot be
 *    submitted and a stale name cannot be recorded.
 * 5. Create the inquiry.
 * 6. Clear the basket and hand the customer their reference.
 *
 * On any failure the customer keeps everything they typed, because the form is
 * re rendered with the values it was given.
 */

function keptValues(formData: FormData): Record<string, string> {
  return Object.fromEntries(
    INQUIRY_FIELD_NAMES.map((field) => [field, String(formData.get(field) ?? "")]),
  );
}

export async function submitInquiry(
  _previous: InquiryFormState,
  formData: FormData,
): Promise<InquiryFormState> {
  const values = keptValues(formData);
  const requestHeaders = await headers();
  const address = clientAddress(requestHeaders);
  const session = await getSession();

  // Guests are limited by address. Everyone is limited by the address they gave,
  // which stops one machine filing inquiries for many different addresses.
  const submittedEmail = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();

  const limit = await checkRateLimits([
    { key: `inquiry:ip:${address}`, limit: 8, windowSeconds: 60 * 60 },
    ...(submittedEmail
      ? [{ key: `inquiry:email:${submittedEmail}`, limit: 5, windowSeconds: 60 * 60 }]
      : []),
  ]);

  if (!limit.allowed) {
    return {
      status: "error",
      values,
      errors: {
        form: "That is a lot of inquiries in a short time. Please wait a little, or call us and we will take the details directly.",
      },
    };
  }

  const parsed = readInquiryForm(formData);

  const attachmentResult = await validateAttachments(
    formData.getAll("attachments").filter((entry): entry is File => entry instanceof File),
  );

  const basket = await readBasket();
  const resolved = await resolveBasket(basket);

  // Rewrite the cookie whenever resolving changed anything, so the customer is
  // not told about the same withdrawn product twice.
  if (resolved.changed) {
    await writeBasket(toBasketItems(resolved.lines));
  }

  const errors: InquiryFieldErrors = parsed.success ? {} : fieldErrorsFrom(parsed.error);

  if (attachmentResult.errors.length > 0) {
    errors.attachments = attachmentResult.errors.join(" ");
  }

  if (resolved.lines.length === 0) {
    errors.basket =
      "Your inquiry is empty. Add the products you need from the catalogue first.";
  } else if (resolved.lines.some((line) => line.needsVariantChoice)) {
    errors.basket =
      "One of your products no longer offers the option you chose. Please pick another before sending.";
  } else if (resolved.dropped.length > 0) {
    errors.basket =
      resolved.dropped.length === 1
        ? "A product in your inquiry is no longer available and has been removed. Please check the list before sending."
        : `${resolved.dropped.length} products in your inquiry are no longer available and have been removed. Please check the list before sending.`;
  }

  if (!parsed.success || Object.keys(errors).length > 0) {
    return { status: "error", values, errors };
  }

  const result = await createInquiry({
    form: parsed.data,
    lines: resolved.lines,
    attachments: attachmentResult.files,
    session: session
      ? { id: session.id, email: session.email, fullName: session.fullName }
      : null,
    ipAddress: address === "unknown" ? null : address,
  });

  if (!result.ok) {
    return { status: "error", values, errors: { form: result.error } };
  }

  await clearBasket();

  // A short lived cookie carries the reference to the confirmation page, so the
  // reference never travels in a URL that could be shared or logged.
  const store = await cookies();
  store.set(RECEIPT_COOKIE, result.id, {
    httpOnly: true,
    sameSite: "lax",
    secure: env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60,
  });

  redirect("/inquiry/received");
}
