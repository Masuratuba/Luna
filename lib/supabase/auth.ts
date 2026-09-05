import { timingSafeEqual, randomUUID } from "node:crypto";
import { createSupabaseServerClient, createSupabaseServiceClient } from "./server";
import { ExternalTrustedAuthAdapter, type TrustedAdminContext, type TrustedUserContext } from "../luna/trusted-auth";

function secretsMatch(provided: string, expected: string): boolean {
  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

const USER_SCOPES = ["search:read", "memory:read", "memory:write", "task:create", "mail.read", "mail.send"];

export async function requireUser(request?: Request): Promise<{
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>> extends infer T ? NonNullable<T> : never;
  user: { id: string };
  role: "admin" | "user";
  trustedAdmin?: TrustedAdminContext;
  identity: TrustedUserContext;
}> {
  const ownerSecret = process.env.LUNA_OWNER_SECRET?.trim();
  const ownerUserId = process.env.LUNA_OWNER_USER_ID?.trim();
  const suppliedSecret = request?.headers.get("x-luna-owner-secret")?.trim() ?? "";

  if (ownerSecret && ownerUserId && suppliedSecret && secretsMatch(suppliedSecret, ownerSecret)) {
    const supabase = createSupabaseServiceClient();
    if (!supabase) throw new Error("SUPABASE_NOT_CONFIGURED");
    const now = Date.now();
    const issuer = process.env.LUNA_TRUSTED_AUTH_ISSUER?.trim() || "luna-owner-secret";
    const assertion = { subject: ownerUserId, role: "admin" as const, issuer, issuedAt: now, expiresAt: now + 5 * 60 * 1000, nonce: randomUUID(), scopes: ["luna:*"] as string[] };
    const trustedAdmin = new ExternalTrustedAuthAdapter(issuer).verify(assertion);
    if (!trustedAdmin) throw new Error("OWNER_AUTH_INVALID");
    return { supabase, user: { id: ownerUserId }, role: "admin", trustedAdmin, identity: trustedAdmin };
  }

  const supabase = await createSupabaseServerClient();
  if (!supabase) throw new Error("SUPABASE_NOT_CONFIGURED");
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) throw new Error("UNAUTHORIZED");

  const now = Date.now();
  const issuer = process.env.LUNA_TRUSTED_AUTH_ISSUER?.trim() || "supabase";
  const assertion = { subject: data.user.id, role: "user" as const, issuer, issuedAt: now, expiresAt: now + 5 * 60 * 1000, nonce: randomUUID(), scopes: USER_SCOPES };
  const identity = new ExternalTrustedAuthAdapter(issuer).verifyIdentity(assertion);
  if (!identity) throw new Error("AUTH_IDENTITY_INVALID");
  return { supabase, user: { id: data.user.id }, role: "user", identity };
}
