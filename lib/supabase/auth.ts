import { timingSafeEqual, randomUUID } from "node:crypto";
import { createSupabaseServerClient, createSupabaseServiceClient } from "./server";
import { isLoginBypassed } from "./mode";
import { OWNER_SESSION_COOKIE, verifyOwnerSession } from "./owner-session";
import { ExternalTrustedAuthAdapter, type TrustedAdminContext, type TrustedUserContext } from "../luna/trusted-auth";

function secretsMatch(provided: string, expected: string): boolean {
  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

function cookieValue(request: Request | undefined, name: string): string | undefined {
  const header = request?.headers.get("cookie");
  if (!header) return undefined;
  for (const part of header.split(";")) {
    const separator = part.indexOf("=");
    if (separator < 0) continue;
    if (part.slice(0, separator).trim() === name) return decodeURIComponent(part.slice(separator + 1).trim());
  }
  return undefined;
}

const USER_SCOPES = ["search:read", "memory:read", "memory:write", "task:create", "mail.read", "mail.send", "calendar.read", "calendar.write"];

export async function requireUser(request?: Request): Promise<{ supabase: Awaited<ReturnType<typeof createSupabaseServerClient>> extends infer T ? NonNullable<T> : never; user: { id: string }; role: "admin" | "user"; trustedAdmin?: TrustedAdminContext; identity: TrustedUserContext }> {
  const ownerSecret = process.env.LUNA_OWNER_SECRET?.trim();
  let ownerUserId = process.env.LUNA_OWNER_USER_ID?.trim();
  const suppliedSecret = request?.headers.get("x-luna-owner-secret")?.trim() ?? "";
  const ownerCookie = cookieValue(request, OWNER_SESSION_COOKIE);
  const sessionOwner = await verifyOwnerSession(ownerCookie, ownerSecret);

  if (ownerSecret && ownerUserId && sessionOwner?.id === ownerUserId) {
    const supabase = createSupabaseServiceClient();
    if (!supabase) throw new Error("SUPABASE_NOT_CONFIGURED");
    const now = Date.now();
    const issuer = process.env.LUNA_TRUSTED_AUTH_ISSUER?.trim() || "luna-owner-session";
    const assertion = { subject: ownerUserId, role: "admin" as const, issuer, issuedAt: now, expiresAt: now + 5 * 60 * 1000, nonce: randomUUID(), scopes: ["luna:*"] as string[] };
    const trustedAdmin = new ExternalTrustedAuthAdapter(issuer).verify(assertion);
    if (!trustedAdmin) throw new Error("OWNER_AUTH_INVALID");
    return { supabase, user: { id: ownerUserId }, role: "admin", trustedAdmin, identity: trustedAdmin };
  }

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

  if (isLoginBypassed()) {
    const supabase = createSupabaseServiceClient();
    if (!supabase) throw new Error("SUPABASE_NOT_CONFIGURED");

    if (!ownerUserId) {
      const { data, error } = await supabase.auth.admin.listUsers({ page: 1, perPage: 1 });
      if (error || !data.users[0]?.id) throw new Error("TEST_USER_NOT_CONFIGURED");
      ownerUserId = data.users[0].id;
    }

    const now = Date.now();
    const issuer = process.env.LUNA_TRUSTED_AUTH_ISSUER?.trim() || "luna-test-mode";
    const assertion = { subject: ownerUserId, role: "admin" as const, issuer, issuedAt: now, expiresAt: now + 5 * 60 * 1000, nonce: randomUUID(), scopes: ["luna:*"] as string[] };
    const identity = new ExternalTrustedAuthAdapter(issuer).verifyIdentity(assertion);
    if (!identity) throw new Error("AUTH_IDENTITY_INVALID");
    return { supabase, user: { id: ownerUserId }, role: "admin", trustedAdmin: identity as TrustedAdminContext, identity };
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
