/**
 * Inquiry statuses, in one place.
 *
 * The same words and the same order are used on the customer's page, in the
 * manager list and in emails, so nobody has to translate between two
 * vocabularies when they are talking about the same inquiry.
 */

export const INQUIRY_STATUSES = [
  "NEW",
  "UNDER_REVIEW",
  "AWAITING_CUSTOMER",
  "CUSTOMER_RESPONDED",
  "QUOTATION_PENDING",
  "QUOTATION_SENT",
  "COMPLETED",
  "CLOSED",
] as const;

export type InquiryStatus = (typeof INQUIRY_STATUSES)[number];

type StatusPresentation = {
  label: string;
  tone: "neutral" | "info" | "caution" | "brass" | "positive" | "critical";
  /** What this status means for the customer, in their words rather than ours. */
  customerNote: string;
};

const presentation: Record<InquiryStatus, StatusPresentation> = {
  NEW: {
    label: "New",
    tone: "info",
    customerNote: "We have your inquiry and it is in the queue for our team.",
  },
  UNDER_REVIEW: {
    label: "Under review",
    tone: "info",
    customerNote: "Our team is checking availability, lead times and pricing.",
  },
  AWAITING_CUSTOMER: {
    label: "Awaiting your reply",
    tone: "caution",
    customerNote: "We have asked you a question and are waiting to hear back.",
  },
  CUSTOMER_RESPONDED: {
    label: "You have replied",
    tone: "info",
    customerNote: "Thank you. Your reply is with our team.",
  },
  QUOTATION_PENDING: {
    label: "Quotation being prepared",
    tone: "brass",
    customerNote: "We are putting together a written quotation for you.",
  },
  QUOTATION_SENT: {
    label: "Quotation sent",
    tone: "brass",
    customerNote: "Your quotation has been sent. Let us know how you would like to proceed.",
  },
  COMPLETED: {
    label: "Completed",
    tone: "positive",
    customerNote: "This inquiry is complete. Get in touch any time if you need more.",
  },
  CLOSED: {
    label: "Closed",
    tone: "neutral",
    customerNote: "This inquiry has been closed. Send a new one whenever you need to.",
  },
};

export function statusLabel(status: string): string {
  return presentation[status as InquiryStatus]?.label ?? "In progress";
}

export function statusTone(status: string): StatusPresentation["tone"] {
  return presentation[status as InquiryStatus]?.tone ?? "neutral";
}

export function statusNote(status: string): string {
  return (
    presentation[status as InquiryStatus]?.customerNote ??
    "Our team is working on this inquiry."
  );
}

/** Statuses a manager may move an inquiry into, in the order they normally run. */
export const managerStatusOptions = INQUIRY_STATUSES.map((status) => ({
  value: status,
  label: presentation[status].label,
}));

export function formatInquiryDate(date: Date): string {
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(date);
}

export function formatInquiryDateTime(date: Date): string {
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(date);
}
