import { describe, expect, it } from "vitest";

import { validationMessage, validationMessages } from "@/i18n/presentation";

describe("localized presentation errors", () => {
  it("maps stable validator messages without changing validators", () => {
    expect(validationMessage("Email is required.")).toEqual({ key: "validation.emailRequired" });
    expect(validationMessage("Use at least 6 characters.")).toEqual({
      key: "validation.passwordMinimum",
      values: { count: 6 },
    });
    expect(validationMessage("accountName is required.")).toEqual({
      key: "validation.fieldRequired",
    });
  });

  it("preserves field associations while translating their messages", () => {
    expect(validationMessages({ email: "Email is required." })).toEqual({
      email: { key: "validation.emailRequired" },
    });
  });
});
