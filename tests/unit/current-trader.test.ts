import { describe, expect, it, vi } from "vitest";

import type { PhoenixSupabaseClient } from "@/lib/supabase/types";
import {
  deriveShellIdentity,
  resolveCurrentTraderIdentity,
  resolveCurrentTraderId,
} from "@/services/trading/current-trader";

function clientWith(
  user: { id: string; email?: string } | null,
  traderResult: {
    data: { id: string; name?: string } | null;
    error: { message: string } | null;
  },
) {
  const maybeSingle = vi.fn().mockResolvedValue(traderResult);
  const client = {
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user }, error: null }),
    },
    from: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({ maybeSingle }),
      }),
    }),
  } as unknown as PhoenixSupabaseClient;

  return { client, maybeSingle };
}

describe("resolveCurrentTraderId", () => {
  it("rejects an unauthenticated request", async () => {
    const { client, maybeSingle } = clientWith(null, { data: null, error: null });

    await expect(resolveCurrentTraderId(client)).rejects.toMatchObject({ code: "UNAUTHENTICATED" });
    expect(maybeSingle).not.toHaveBeenCalled();
  });

  it("maps a trader lookup failure to a persistence error", async () => {
    const { client } = clientWith(
      { id: "auth-user" },
      { data: null, error: { message: "database unavailable" } },
    );

    await expect(resolveCurrentTraderId(client)).rejects.toMatchObject({
      code: "PERSISTENCE_ERROR",
    });
  });

  it("rejects an authenticated user without a trader profile", async () => {
    const { client } = clientWith({ id: "auth-user" }, { data: null, error: null });

    await expect(resolveCurrentTraderId(client)).rejects.toMatchObject({
      code: "TRADER_PROFILE_NOT_FOUND",
    });
  });

  it("returns the current trader id", async () => {
    const { client } = clientWith({ id: "auth-user" }, { data: { id: "trader-id" }, error: null });

    await expect(resolveCurrentTraderId(client)).resolves.toBe("trader-id");
  });
});

describe("deriveShellIdentity", () => {
  it("uses a trimmed Trader name with email context", () => {
    expect(deriveShellIdentity("  Phoenix Trader  ", "trader@example.test")).toEqual({
      primary: "Phoenix Trader",
      secondary: "trader@example.test",
    });
  });

  it("falls back to the authenticated email when the Trader name is blank", () => {
    expect(deriveShellIdentity("   ", "trader@example.test")).toEqual({
      primary: "trader@example.test",
      secondary: "Trading workspace",
    });
  });

  it("keeps a Trader name with neutral context when email is unavailable", () => {
    expect(deriveShellIdentity("Phoenix Trader", null)).toEqual({
      primary: "Phoenix Trader",
      secondary: "Trading workspace",
    });
  });

  it("uses a deterministic neutral fallback without identifiers", () => {
    expect(deriveShellIdentity()).toEqual({
      primary: "Trader",
      secondary: "Trading workspace",
    });
  });
});

describe("resolveCurrentTraderIdentity", () => {
  it("resolves safe Trader and Auth display data", async () => {
    const { client } = clientWith(
      { id: "auth-user", email: "trader@example.test" },
      { data: { id: "internal-trader-id", name: "Phoenix Trader" }, error: null },
    );

    await expect(resolveCurrentTraderIdentity(client)).resolves.toEqual({
      primary: "Phoenix Trader",
      secondary: "trader@example.test",
    });
  });

  it("falls back to email when the optional Trader lookup fails", async () => {
    const { client } = clientWith(
      { id: "auth-user", email: "trader@example.test" },
      { data: null, error: { message: "database unavailable" } },
    );

    await expect(resolveCurrentTraderIdentity(client)).resolves.toEqual({
      primary: "trader@example.test",
      secondary: "Trading workspace",
    });
  });

  it("returns a neutral identity without querying for unauthenticated requests", async () => {
    const { client, maybeSingle } = clientWith(null, { data: null, error: null });

    await expect(resolveCurrentTraderIdentity(client)).resolves.toEqual({
      primary: "Trader",
      secondary: "Trading workspace",
    });
    expect(maybeSingle).not.toHaveBeenCalled();
  });
});
