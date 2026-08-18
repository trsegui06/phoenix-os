export type SupabaseConfig = {
  url: string;
  publishableKey: string;
};

function isLocalHostname(hostname: string) {
  return hostname === "localhost" || hostname === "127.0.0.1" || hostname === "[::1]";
}

export function getSupabaseConfig(): SupabaseConfig | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!url && !publishableKey) return null;
  if (!url || !publishableKey)
    throw new Error("Supabase URL and publishable key must be configured together.");

  const parsed = new URL(url);
  if (parsed.username || parsed.password || parsed.search || parsed.hash || parsed.pathname !== "/")
    throw new Error("NEXT_PUBLIC_SUPABASE_URL must be an origin without credentials or a path.");
  if (process.env.NODE_ENV === "production" && parsed.protocol !== "https:")
    throw new Error("NEXT_PUBLIC_SUPABASE_URL must use HTTPS in production.");
  if (process.env.NODE_ENV === "production" && isLocalHostname(parsed.hostname))
    throw new Error("Production cannot use a local Supabase URL.");

  return { url: parsed.origin, publishableKey };
}
