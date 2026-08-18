import { afterEach, describe, expect, it, vi } from "vitest";

import { trustedSiteUrl } from "@/lib/auth/public-auth";
import { getSupabaseConfig } from "@/lib/supabase/config";

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("deployment environment configuration", () => {
  it("allows local HTTP origins only outside production", () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "http://127.0.0.1:3000");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "http://127.0.0.1:54321");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "local-key");

    expect(trustedSiteUrl()).toBe("http://127.0.0.1:3000");
    expect(getSupabaseConfig()).toEqual({
      url: "http://127.0.0.1:54321",
      publishableKey: "local-key",
    });
  });

  it("requires an explicit non-local HTTPS site origin in production", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "");
    expect(trustedSiteUrl).toThrow("required in production");

    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "http://localhost:3000");
    expect(trustedSiteUrl).toThrow("non-local HTTPS");

    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://app.example.com/");
    expect(trustedSiteUrl()).toBe("https://app.example.com");
  });

  it.each([
    "http://preview.example.com",
    "https://preview.example.com/callback",
    "https://user:password@preview.example.com",
    "not-a-url",
  ])("rejects an unsafe site origin: %s", (value) => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", value);
    expect(trustedSiteUrl).toThrow();
  });

  it("requires the Supabase URL and key as a pair", () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://preview.supabase.co");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "");
    expect(getSupabaseConfig).toThrow("configured together");
  });

  it("rejects local, non-HTTPS, or path-bearing Supabase URLs in production", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "public-key");

    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "http://127.0.0.1:54321");
    expect(getSupabaseConfig).toThrow("HTTPS in production");

    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://127.0.0.1:54321");
    expect(getSupabaseConfig).toThrow("cannot use a local Supabase URL");

    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://production.supabase.co/rest/v1");
    expect(getSupabaseConfig).toThrow("without credentials or a path");
  });

  it("accepts a hosted HTTPS Supabase origin in production", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://production.supabase.co/");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "public-key");
    expect(getSupabaseConfig()).toEqual({
      url: "https://production.supabase.co",
      publishableKey: "public-key",
    });
  });
});
