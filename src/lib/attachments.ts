/**
 * Attachment limits, shared by the upload field and the validator behind it.
 *
 * The browser uses these to set expectations. The server uses the same numbers
 * to enforce them, and never trusts what the browser did with them.
 */

export const MAX_FILE_BYTES = 10 * 1024 * 1024;
export const MAX_FILES = 5;
export const MAX_TOTAL_BYTES = 25 * 1024 * 1024;

export const acceptAttribute = ".pdf,.jpg,.jpeg,.png,.webp";
export const acceptedDescription = "PDF, JPEG, PNG or WebP, up to 10 MB each";
