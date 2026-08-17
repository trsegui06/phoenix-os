import { describe, expect, it, vi } from "vitest";

import type { PhoenixSupabaseClient } from "@/lib/supabase/types";
import { resolveCurrentTraderId } from "@/services/trading/current-trader";

function clientWith(
  user: { id: string } | null,
  traderResult: { data: { id: string } | null; error: { message: string } | null },
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
