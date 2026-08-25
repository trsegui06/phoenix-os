import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";

import { trustedSiteUrl } from "@/lib/auth/public-auth";
import { getSupabaseConfig } from "@/lib/supabase/config";
import type { Database } from "@/lib/supabase/database.types";

const invalidRecoveryPath = "/forgot-password?recovery=invalid";

export async function GET(request: NextRequest) {
  const tokenHash = request.nextUrl.searchParams.get("token_hash");
  const type = request.nextUrl.searchParams.get("type");
  const code = request.nextUrl.searchParams.get("code");
  const config = getSupabaseConfig();
  if (!config || (type !== "recovery" && !code)) {
    return NextResponse.redirect(new URL(invalidRecoveryPath, trustedSiteUrl()));
  }

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

  const verification = tokenHash
    ? await client.auth.verifyOtp({ token_hash: tokenHash, type: "recovery" })
    : await client.auth.exchangeCodeForSession(code!);
  if (verification.error || !verification.data.session) {
    return NextResponse.redirect(new URL(invalidRecoveryPath, trustedSiteUrl()));
  }

  const response = NextResponse.redirect(
    new URL("/reset-password?recovery=authorized", trustedSiteUrl()),
  );
  pendingCookies.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
  response.cookies.set("phoenix-recovery-authorized", "1", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 600,
  });
  return response;
}
