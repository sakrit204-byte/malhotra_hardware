"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { emptyAuthState, type AuthFormState } from "@/lib/auth-form";
import { getSession } from "@/server/auth/session";
import { prisma } from "@/server/db/prisma";
import { authoriseInquiryAccess } from "@/server/inquiry/access";
import { checkRateLimits, clientAddress } from "@/server/rate-limit";
import { sendCustomerMessage } from "@/server/services/conversation";
import { headers } from "next/headers";

/**
 * The customer's side of the conversation.
 *
 * Reachable from an account and from the signed link a guest was emailed, so
 * the token has to be accepted here as well as on the page that rendered the
 * form. Authorisation is asked for again rather than assumed: the page that
 * showed the form and the action that writes the message are separate requests,
 * and only one of them has been checked so far.
 */

const replySchema = z.object({
  inquiryId: z.string().min(1).max(60),
  body: z
    .string()
    .trim()
    .min(2, "Write a message before sending.")
    .max(4000, "That message is longer than we can store."),
  token: z
    .string()
    .max(200)
    .optional()
    .transform((value) => (value && value.length > 0 ? value : undefined)),
});

export async function replyAsCustomerAction(
  _previous: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const parsed = replySchema.safeParse({
    inquiryId: formData.get("inquiryId") ?? "",
    body: formData.get("body") ?? "",
    token: formData.get("token") ?? "",
  });

  if (!parsed.success) {
    return {
      status: "error",
      values: { body: String(formData.get("body") ?? "") },
      errors: {
        body: parsed.error.issues[0]?.message ?? "That message could not be sent.",
      },
    };
  }

  const requestHeaders = await headers();
  const address = clientAddress(requestHeaders);

  const limit = await checkRateLimits([
    { key: `reply:ip:${address}`, limit: 30, windowSeconds: 60 * 60 },
    { key: `reply:inquiry:${parsed.data.inquiryId}`, limit: 20, windowSeconds: 60 * 60 },
  ]);

  if (!limit.allowed) {
    return {
      status: "error",
      values: { body: parsed.data.body },
      errors: {
        form: "That is a lot of messages in a short time. Please wait a little, or call us.",
      },
    };
  }

  const access = await authoriseInquiryAccess(parsed.data.inquiryId, {
    token: parsed.data.token,
  });

  // Staff write through the manager platform, not through this form.
  if (!access.allowed || access.isStaff) {
    return {
      status: "error",
      values: { body: parsed.data.body },
      errors: { form: "This inquiry could not be opened. The link may have expired." },
    };
  }

  const [session, inquiry] = await Promise.all([
    getSession(),
    prisma.inquiry.findUnique({
      where: { id: parsed.data.inquiryId },
      select: { fullName: true },
    }),
  ]);

  const result = await sendCustomerMessage({
    inquiryId: parsed.data.inquiryId,
    body: parsed.data.body,
    sender: session ? { id: session.id, fullName: session.fullName } : null,
    fallbackName: inquiry?.fullName ?? "Customer",
  });

  if (!result.ok) {
    return {
      status: "error",
      values: { body: parsed.data.body },
      errors: { form: result.error },
    };
  }

  revalidatePath(`/account/inquiries/${parsed.data.inquiryId}`);
  revalidatePath("/account/inquiries");
  revalidatePath("/inquiry/track");

  return {
    ...emptyAuthState,
    status: "sent",
    message: "Your message is with our team. They will reply by email.",
  };
}
