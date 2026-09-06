/**
 * Shapes shared by the inquiry form and the action behind it.
 *
 * These live outside both the server action module and the server only modules
 * so that the client component can import them. A file marked "use server" may
 * only export async functions, and a file marked "server only" may not be
 * imported into the browser bundle at all.
 */

export type InquiryFieldName =
  | "fullName"
  | "email"
  | "phone"
  | "message"
  | "companyName"
  | "projectName"
  | "projectLocation"
  | "additionalRequirements";

export type InquiryFieldErrors = Partial<
  Record<InquiryFieldName | "attachments" | "basket" | "form", string>
>;

export type InquiryFormState = {
  status: "idle" | "error";
  errors: InquiryFieldErrors;
  /** What the customer typed, so nothing is lost when the server says no. */
  values: Record<string, string>;
};

export const emptyInquiryFormState: InquiryFormState = {
  status: "idle",
  errors: {},
  values: {},
};

export const INQUIRY_FIELD_NAMES: InquiryFieldName[] = [
  "fullName",
  "email",
  "phone",
  "message",
  "companyName",
  "projectName",
  "projectLocation",
  "additionalRequirements",
];
