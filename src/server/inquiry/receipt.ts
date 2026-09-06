/**
 * Name of the short lived cookie that identifies the inquiry a customer has
 * just sent. It lives here rather than beside the action because a module
 * marked "use server" may only export async functions.
 */
export const RECEIPT_COOKIE = "me_inquiry_receipt";
