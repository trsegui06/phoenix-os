export type LoginCredentials = {
  email: string;
  password: string;
};

export type LoginValidationResult =
  | { success: true; data: LoginCredentials }
  | {
      success: false;
      fieldErrors: { email?: string; password?: string };
    };

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validateLoginCredentials(
  emailValue: unknown,
  passwordValue: unknown,
): LoginValidationResult {
  const email = typeof emailValue === "string" ? emailValue.trim() : "";
  const password = typeof passwordValue === "string" ? passwordValue : "";
  const fieldErrors: { email?: string; password?: string } = {};

  if (!email) {
    fieldErrors.email = "Email is required.";
  } else if (!emailPattern.test(email)) {
    fieldErrors.email = "Enter a valid email address.";
  }

  if (!password) {
    fieldErrors.password = "Password is required.";
  }

  if (fieldErrors.email || fieldErrors.password) {
    return { success: false, fieldErrors };
  }

  return { success: true, data: { email, password } };
}

export function mapAuthenticationError(code?: string): string {
  return code === "invalid_credentials"
    ? "Email or password is incorrect."
    : "Unable to sign in right now. Please try again.";
}
