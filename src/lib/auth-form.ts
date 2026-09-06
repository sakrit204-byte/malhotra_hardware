/**
 * Shapes shared by the account forms and the actions behind them.
 *
 * They live outside both the action modules and the server only modules,
 * because a file marked "use server" may export nothing but async functions and
 * a file marked "server only" may not reach the browser at all.
 */

export type AuthFormState = {
  status: "idle" | "error" | "sent";
  /** One message per field, keyed by the field name. */
  errors: Record<string, string>;
  /** What was typed, so a rejected form does not lose it. Never a password. */
  values: Record<string, string>;
  /** Shown after something succeeded without navigating away. */
  message?: string;
};

export const emptyAuthState: AuthFormState = {
  status: "idle",
  errors: {},
  values: {},
};

/**
 * The same words whether or not the address is registered.
 *
 * Both the reset form and the resend form say this, so neither can be used to
 * find out which addresses have accounts.
 */
export const NEUTRAL_EMAIL_SENT =
  "If there is an account for that address, we have sent it an email. Check your inbox, and your spam folder if it is not there.";
