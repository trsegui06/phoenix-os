export type PresentationMessage = {
  key: string;
  values?: Record<string, string | number>;
};

const validationKeys: Record<string, string> = {
  "Email is required.": "validation.emailRequired",
  "Enter a valid email address.": "validation.emailInvalid",
  "Password is required.": "validation.passwordRequired",
  "Confirm your password.": "validation.passwordConfirmRequired",
  "Passwords must match.": "validation.passwordMismatch",
  "Balance must not be negative.": "validation.balanceNonNegative",
  "Enter a balance with at most two decimals.": "validation.balanceInvalid",
};

export function validationMessage(message: string): PresentationMessage {
  const key = validationKeys[message];
  if (key) return { key };
  const minimum = message.match(/^Use at least (\d+) characters\.$/);
  if (minimum) return { key: "validation.passwordMinimum", values: { count: Number(minimum[1]) } };
  if (/^\w+ is required\.$/.test(message)) return { key: "validation.fieldRequired" };
  return { key: "validation.invalidField" };
}

export function validationMessages(
  errors: Record<string, string> | undefined,
): Record<string, PresentationMessage> | undefined {
  if (!errors) return undefined;
  return Object.fromEntries(
    Object.entries(errors).map(([field, message]) => [field, validationMessage(message)]),
  );
}
