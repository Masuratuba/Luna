import { timingSafeEqual } from "node:crypto";
import { createSupabaseServerClient, createSupabaseServiceClient } from "./server";

function secretsMatch(provided: string, expected: string): boolean {
  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function requireUser(request?: Request) {
  const ownerSecret = process.env.LUNA_OWNER_SECRET?.trim();
  const ownerUserId = process.env.LUNA_OWNER_USER_ID?.trim();
  const suppliedSecret = request?.headers.get("x-luna-owner-secret")?.trim() ?? "";

  // Development/owner path: no normal user login is required, but the secret
  // is verified server-side and the database client is privileged and server-only.
  if (ownerSecret && ownerUserId && suppliedSecret && secretsMatch(suppliedSecret, ownerSecret)) {
    const supabase = createSupabaseServiceClient();
    if (!supabase) throw new Error("SUPABASE_NOT_CONFIGURED");
    return {
      supabase,
      user: { id: ownerUserId },
      role: "admin" as const,
      adminAuthenticated: true,
    };
  }

  const supabase = await createSupabaseServerClient();
  if (!supabase) throw new Error("SUPABASE_NOT_CONFIGURED");
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) throw new Error("UNAUTHORIZED");
  return { supabase, user: data.user, role: "user" as const, adminAuthenticated: false };
}
