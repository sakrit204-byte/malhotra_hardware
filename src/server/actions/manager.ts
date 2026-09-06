"use server";

import { revalidatePath } from "next/cache";

import { emptyAuthState, type AuthFormState } from "@/lib/auth-form";
import { requireRole } from "@/server/auth/guards";
import {
  assignInquiry,
  changeInquiryStatus,
  sendManagerMessage,
} from "@/server/services/conversation";
import {
  assignSchema,
  managerMessageSchema,
  statusChangeSchema,
} from "@/server/validation/manager";

/**
 * Manager actions.
 *
 * Every one starts by confirming the role against the database. Middleware only
 * looked for a cookie and the page only rendered; an action changes things, so
 * it checks for itself rather than trusting that the page it came from did.
 */

export async function sendManagerMessageAction(
  _previous: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const manager = await requireRole("MANAGER");

  const parsed = managerMessageSchema.safeParse({
    inquiryId: formData.get("inquiryId") ?? "",
    body: formData.get("body") ?? "",
    isInternalNote: formData.get("isInternalNote") ?? false,
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

  const result = await sendManagerMessage({
    inquiryId: parsed.data.inquiryId,
    manager: {
      id: manager.id,
      fullName: manager.fullName,
      email: manager.email,
    },
    body: parsed.data.body,
    isInternalNote: parsed.data.isInternalNote,
  });

  if (!result.ok) {
    return {
      status: "error",
      values: { body: parsed.data.body },
      errors: { form: result.error },
    };
  }

  revalidatePath(`/manager/inquiries/${parsed.data.inquiryId}`);
  revalidatePath("/manager/inquiries");
  revalidatePath("/manager");

  return {
    ...emptyAuthState,
    status: "sent",
    message: parsed.data.isInternalNote
      ? "Note added. The customer cannot see it."
      : result.emailed
        ? "Sent, and emailed to the customer."
        : "Saved, but the email could not be delivered. Check the delivery log below.",
  };
}

export async function changeStatusAction(formData: FormData): Promise<void> {
  const manager = await requireRole("MANAGER");

  const parsed = statusChangeSchema.safeParse({
    inquiryId: formData.get("inquiryId") ?? "",
    status: formData.get("status") ?? "",
    note: formData.get("note") ?? "",
  });

  if (!parsed.success) return;

  // A quiet change is for correcting a mistake. Anything else tells the
  // customer, because a status they cannot see is not a status.
  const notifyCustomer = formData.get("quiet") !== "on";

  await changeInquiryStatus({
    inquiryId: parsed.data.inquiryId,
    status: parsed.data.status,
    note: parsed.data.note,
    actor: { id: manager.id, fullName: manager.fullName, email: manager.email },
    notifyCustomer,
  });

  revalidatePath(`/manager/inquiries/${parsed.data.inquiryId}`);
  revalidatePath("/manager/inquiries");
  revalidatePath("/manager");
}

export async function assignInquiryAction(formData: FormData): Promise<void> {
  const manager = await requireRole("MANAGER");

  const parsed = assignSchema.safeParse({
    inquiryId: formData.get("inquiryId") ?? "",
    managerId: formData.get("managerId") ?? "",
  });

  if (!parsed.success) return;

  await assignInquiry({
    inquiryId: parsed.data.inquiryId,
    managerId: parsed.data.managerId,
    actor: { id: manager.id, email: manager.email },
  });

  revalidatePath(`/manager/inquiries/${parsed.data.inquiryId}`);
  revalidatePath("/manager/inquiries");
}
