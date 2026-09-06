/**
 * Inquiry reference numbers.
 *
 * Format: ME YYYY NNNNNN, for example ME 2026 001284. Spaces rather than
 * punctuation, so the reference can appear in interface copy, in an email
 * subject and on a printed summary without containing a hyphen.
 */

const PREFIX = "ME";
const SEQUENCE_DIGITS = 6;

export function formatInquiryReference(year: number, sequence: number): string {
  return `${PREFIX} ${year} ${String(sequence).padStart(SEQUENCE_DIGITS, "0")}`;
}

/** Parses a reference back into its parts, or returns null when it is not one. */
export function parseInquiryReference(
  value: string,
): { year: number; sequence: number } | null {
  const match = value
    .trim()
    .toUpperCase()
    .match(/^ME\s+(\d{4})\s+(\d{1,8})$/);

  if (!match) return null;

  return { year: Number(match[1]), sequence: Number(match[2]) };
}

/**
 * Accepts what a customer is likely to type into a search box. People drop the
 * prefix, the spaces or the leading zeros, and all of those should still find
 * the inquiry.
 */
export function normaliseReferenceSearch(value: string): string {
  return value.trim().toUpperCase().replace(/\s+/g, " ");
}

/** Quotation numbers follow the same shape so the two read as one family. */
export function formatQuotationNumber(year: number, sequence: number): string {
  return `ME Q ${year} ${String(sequence).padStart(4, "0")}`;
}
