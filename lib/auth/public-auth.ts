export type PasswordFields = { password?: string; confirmPassword?: string };

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export const passwordMinimumLength = 6;

export function validateEmail(value: unknown) {
  const email = typeof value === "string" ? value.trim() : "";
  if (!email) return { email: "Email is required." };
  if (!emailPattern.test(email)) return { email: "Enter a valid email address." };
  return { email: undefined, value: email };
}

export function validateNewPassword(passwordValue: unknown, confirmValue: unknown) {
  const password = typeof passwordValue === "string" ? passwordValue : "";
  const confirmPassword = typeof confirmValue === "string" ? confirmValue : "";
  const errors: PasswordFields = {};
  if (!password) errors.password = "Password is required.";
  else if (password.length < passwordMinimumLength)
    errors.password = `Use at least ${passwordMinimumLength} characters.`;
  if (!confirmPassword) errors.confirmPassword = "Confirm your password.";
  else if (password !== confirmPassword) errors.confirmPassword = "Passwords must match.";
  return Object.keys(errors).length
    ? { success: false as const, errors }
    : { success: true as const, password };
}

export function trustedSiteUrl() {
  const configured = process.env.NEXT_PUBLIC_SITE_URL;
  if (!configured) {
    if (process.env.NODE_ENV === "production")
      throw new Error("NEXT_PUBLIC_SITE_URL is required in production.");
    return "http://127.0.0.1:3000";
  }
  const url = new URL(configured);
  const local = url.hostname === "127.0.0.1" || url.hostname === "localhost";
  if (url.username || url.password || url.search || url.hash || url.pathname !== "/")
    throw new Error("NEXT_PUBLIC_SITE_URL must be an origin without credentials or a path.");
  if (url.protocol !== "https:" && !local)
    throw new Error("NEXT_PUBLIC_SITE_URL must use HTTPS outside local development.");
  if (process.env.NODE_ENV === "production" && (url.protocol !== "https:" || local))
    throw new Error("Production requires a non-local HTTPS NEXT_PUBLIC_SITE_URL.");
  return url.origin;
}

export function recoveryStateMatches(expected: string, received: string) {
  const a = Buffer.from(expected);
  const b = Buffer.from(received);
  return a.length === b.length && timingSafeEqual(a, b);
}
import { timingSafeEqual } from "node:crypto";
