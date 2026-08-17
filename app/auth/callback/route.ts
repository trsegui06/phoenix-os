import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { type NextRequest, NextResponse } from "next/server";

import { recoveryStateMatches, trustedSiteUrl } from "@/lib/auth/public-auth";
import { getSupabaseConfig } from "@/lib/supabase/config";
import type { Database } from "@/lib/supabase/database.types";
import { hasCurrentTrader } from "@/services/trading/trader-provisioning";

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const flow = request.nextUrl.searchParams.get("flow");
  const state = request.nextUrl.searchParams.get("state");
  const config = getSupabaseConfig();
  if (!code || !config)
    return NextResponse.redirect(new URL("/login?auth=invalid", trustedSiteUrl()));
  const pendingCookies: Array<{ name: string; value: string; options: Record<string, unknown> }> =
    [];
  const client = createServerClient<Database>(config.url, config.publishableKey, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (values) => {
        pendingCookies.push(...values);
      },
    },
  });
  const { error } = await client.auth.exchangeCodeForSession(code);
  if (error) return NextResponse.redirect(new URL("/login?auth=invalid", trustedSiteUrl()));
  const redirectWithSession = (path: string) => {
    const response = NextResponse.redirect(new URL(path, trustedSiteUrl()));
    pendingCookies.forEach(({ name, value, options }) =>
      response.cookies.set(name, value, options),
    );
    return response;
  };
  if (flow === "recovery") {
    const store = await cookies();
    const expected = store.get("phoenix-recovery-state")?.value;
    if (!state || !expected || !recoveryStateMatches(expected, state)) {
      await client.auth.signOut();
      return NextResponse.redirect(new URL("/forgot-password?recovery=invalid", trustedSiteUrl()));
    }
    const response = redirectWithSession("/reset-password?recovery=authorized");
    response.cookies.set("phoenix-recovery-authorized", "1", {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 600,
    });
    return response;
  }
  return redirectWithSession((await hasCurrentTrader(client)) ? "/trading" : "/onboarding");
}
