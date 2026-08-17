import { describe, expect, it } from "vitest";

import { mapAuthenticationError, validateLoginCredentials } from "@/lib/auth/login";

describe("authentication login validation", () => {
  it("trims and accepts sensible credentials without imposing password complexity", () => {
    expect(validateLoginCredentials(" trader@example.com ", "x")).toEqual({
      success: true,
      data: { email: "trader@example.com", password: "x" },
    });
  });

  it("returns stable field errors for missing and malformed input", () => {
    expect(validateLoginCredentials("not-an-email", "")).toEqual({
      success: false,
      fieldErrors: {
        email: "Enter a valid email address.",
        password: "Password is required.",
      },
    });
    expect(validateLoginCredentials(" ", null)).toEqual({
      success: false,
      fieldErrors: { email: "Email is required.", password: "Password is required." },
    });
  });

  it("maps invalid credentials generically and hides other provider errors", () => {
    expect(mapAuthenticationError("invalid_credentials")).toBe("Email or password is incorrect.");
    expect(mapAuthenticationError("provider_internal_detail")).toBe(
      "Unable to sign in right now. Please try again.",
    );
  });
});
