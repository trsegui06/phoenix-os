import { describe, expect, it } from "vitest";

import {
  passwordMinimumLength,
  recoveryStateMatches,
  validateEmail,
  validateNewPassword,
} from "@/lib/auth/public-auth";

describe("public authentication validation", () => {
  it("normalizes a valid email", () => {
    expect(validateEmail("  trader@example.test ")).toEqual({
      email: undefined,
      value: "trader@example.test",
    });
  });

  it.each(["", "missing-at", "missing@domain"])("rejects invalid email %s", (email) => {
    expect(validateEmail(email).email).toBeTruthy();
  });

  it("requires a provider-compatible password and exact confirmation", () => {
    expect(
      validateNewPassword("x".repeat(passwordMinimumLength), "x".repeat(passwordMinimumLength)),
    ).toMatchObject({ success: true });
    expect(validateNewPassword("short", "short")).toMatchObject({ success: false });
    expect(validateNewPassword("Phoenix-123!", "Different-123!")).toMatchObject({ success: false });
  });

  it("compares recovery state without accepting a different value", () => {
    expect(recoveryStateMatches("same-state", "same-state")).toBe(true);
    expect(recoveryStateMatches("same-state", "other-state")).toBe(false);
  });
});
