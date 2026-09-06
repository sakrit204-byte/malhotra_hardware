"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import type { z } from "zod";

import {
  emptyAuthState,
  NEUTRAL_EMAIL_SENT,
  type AuthFormState,
} from "@/lib/auth-form";
import { checkRateLimits, clientAddress } from "@/server/rate-limit";
import {
  completePasswordReset,
  registerAccount,
  requestPasswordReset,
  resendVerification,
  signIn,
  signOut,
} from "@/server/services/auth";
import {
  loginSchema,
  registerSchema,
  requestResetSchema,
  resetPasswordSchema,
  safeRedirect,
} from "@/server/validation/auth";

/**
 * Account actions.
 *
 * Each one rate limits first, validates second and only then does any work. The
 * limits are per address and per email, because an attacker with one machine
 * and a list of addresses and an attacker with many machines and one address
 * are different problems and both need answering.
 */

function fieldErrors(error: z.ZodError): Record<string, string> {
  const errors: Record<string, string> = {};

  for (const issue of error.issues) {
    const field = issue.path[0];
    if (typeof field === "string" && !(field in errors)) {
      errors[field] = issue.message;
    }
  }

  return errors;
}

function keep(formData: FormData, fields: string[]): Record<string, string> {
  return Object.fromEntries(
    fields.map((field) => [field, String(formData.get(field) ?? "")]),
  );
}

async function requestContext() {
  const requestHeaders = await headers();
  const address = clientAddress(requestHeaders);

  return {
    address,
    ipAddress: address === "unknown" ? null : address,
    userAgent: requestHeaders.get("user-agent"),
  };
}

const TOO_MANY =
  "Too many attempts from here. Please wait a few minutes and try again, or call us and we will help directly.";

// ---------------------------------------------------------------- register

export async function registerAction(
  _previous: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const values = keep(formData, ["fullName", "email", "phone", "companyName"]);
  const { address, ipAddress } = await requestContext();

  const limit = await checkRateLimits([
    { key: `register:ip:${address}`, limit: 6, windowSeconds: 60 * 60 },
  ]);

  if (!limit.allowed) {
    return { status: "error", values, errors: { form: TOO_MANY } };
  }

  const parsed = registerSchema.safeParse({
    fullName: formData.get("fullName") ?? "",
    email: formData.get("email") ?? "",
    phone: formData.get("phone") ?? "",
    companyName: formData.get("companyName") ?? "",
    password: formData.get("password") ?? "",
  });

  if (!parsed.success) {
    return { status: "error", values, errors: fieldErrors(parsed.error) };
  }

  const result = await registerAccount(parsed.data, { ipAddress });

  if (!result.ok) {
    return { status: "error", values, errors: { form: result.error } };
  }

  redirect(`/register/sent?email=${encodeURIComponent(parsed.data.email)}`);
}

// ------------------------------------------------------------------- login

export async function loginAction(
  _previous: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const values = keep(formData, ["email"]);
  const next = safeRedirect(String(formData.get("next") ?? ""));
  const { address, ipAddress, userAgent } = await requestContext();

  const email = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();

  const limit = await checkRateLimits([
    { key: `login:ip:${address}`, limit: 20, windowSeconds: 15 * 60 },
    ...(email ? [{ key: `login:email:${email}`, limit: 8, windowSeconds: 15 * 60 }] : []),
  ]);

  if (!limit.allowed) {
    return { status: "error", values, errors: { form: TOO_MANY } };
  }

  const parsed = loginSchema.safeParse({
    email: formData.get("email") ?? "",
    password: formData.get("password") ?? "",
  });

  if (!parsed.success) {
    return { status: "error", values, errors: fieldErrors(parsed.error) };
  }

  const result = await signIn(parsed.data, { ipAddress, userAgent });

  if (!result.ok) {
    return { status: "error", values, errors: { form: result.error } };
  }

  redirect(next);
}

// ------------------------------------------------------------------ logout

export async function logoutAction(): Promise<void> {
  await signOut();
  redirect("/");
}

// ------------------------------------------------- resend the confirmation

export async function resendVerificationAction(
  _previous: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const values = keep(formData, ["email"]);
  const { address } = await requestContext();

  const email = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();

  const limit = await checkRateLimits([
    { key: `resend:ip:${address}`, limit: 6, windowSeconds: 60 * 60 },
    ...(email ? [{ key: `resend:email:${email}`, limit: 4, windowSeconds: 60 * 60 }] : []),
  ]);

  // Even a refusal is phrased neutrally, so the limit cannot be used to probe
  // which addresses exist.
  if (!limit.allowed) {
    return { ...emptyAuthState, status: "sent", message: NEUTRAL_EMAIL_SENT };
  }

  const parsed = requestResetSchema.safeParse({ email: formData.get("email") ?? "" });

  if (!parsed.success) {
    return { status: "error", values, errors: fieldErrors(parsed.error) };
  }

  await resendVerification(parsed.data.email).catch((error) => {
    console.error("Could not resend the verification email", error);
  });

  return { status: "sent", values: {}, errors: {}, message: NEUTRAL_EMAIL_SENT };
}

// ------------------------------------------------------------ reset request

export async function requestResetAction(
  _previous: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const values = keep(formData, ["email"]);
  const { address } = await requestContext();

  const email = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();

  const limit = await checkRateLimits([
    { key: `reset:ip:${address}`, limit: 8, windowSeconds: 60 * 60 },
    ...(email ? [{ key: `reset:email:${email}`, limit: 4, windowSeconds: 60 * 60 }] : []),
  ]);

  if (!limit.allowed) {
    return { ...emptyAuthState, status: "sent", message: NEUTRAL_EMAIL_SENT };
  }

  const parsed = requestResetSchema.safeParse({ email: formData.get("email") ?? "" });

  if (!parsed.success) {
    return { status: "error", values, errors: fieldErrors(parsed.error) };
  }

  await requestPasswordReset(parsed.data.email).catch((error) => {
    console.error("Could not start the password reset", error);
  });

  return { status: "sent", values: {}, errors: {}, message: NEUTRAL_EMAIL_SENT };
}

// ------------------------------------------------------------- reset finish

export async function completeResetAction(
  _previous: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const { address, ipAddress, userAgent } = await requestContext();

  const limit = await checkRateLimits([
    { key: `resetConfirm:ip:${address}`, limit: 12, windowSeconds: 60 * 60 },
  ]);

  if (!limit.allowed) {
    return { status: "error", values: {}, errors: { form: TOO_MANY } };
  }

  const parsed = resetPasswordSchema.safeParse({
    token: formData.get("token") ?? "",
    password: formData.get("password") ?? "",
    confirmPassword: formData.get("confirmPassword") ?? "",
  });

  if (!parsed.success) {
    return { status: "error", values: {}, errors: fieldErrors(parsed.error) };
  }

  const result = await completePasswordReset(parsed.data.token, parsed.data.password, {
    ipAddress,
    userAgent,
  });

  if (!result.ok) {
    return { status: "error", values: {}, errors: { form: result.error } };
  }

  redirect("/account/inquiries?passwordChanged=1");
}
