import { describe, expect, it } from "vitest";

import { formatDisplayName } from "@/lib/format";

describe("formatDisplayName", () => {
  it("trims display text", () => {
    expect(formatDisplayName("  Phoenix OS  ")).toBe("Phoenix OS");
  });
});
