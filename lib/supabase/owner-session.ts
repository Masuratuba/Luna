const COOKIE_NAME = "luna_owner_session";
const SESSION_SECONDS = 60 * 60 * 24 * 14;

function encodeBytes(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
}

function decodeBytes(value: string): Uint8Array {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const binary = atob(normalized + "=".repeat((4 - normalized.length % 4) % 4));
  return Uint8Array.from(binary, (char) => char.charCodeAt(0));
}

async function signature(payload: string, secret: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"],
  );
  return encodeBytes(new Uint8Array(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(payload))));
}

export async function createOwnerSession(userId: string, secret: string): Promise<string> {
  const payload = encodeBytes(new TextEncoder().encode(JSON.stringify({
    sub: userId,
    exp: Math.floor(Date.now() / 1000) + SESSION_SECONDS,
  })));
  return payload + "." + await signature(payload, secret);
}

export async function verifyOwnerSession(token: string | undefined, secret: string | undefined): Promise<{ id: string } | null> {
  if (!token || !secret) return null;
  const parts = token.split(".");
  if (parts.length !== 2) return null;
  try {
    if (!await crypto.subtle.verify(
      "HMAC",
      await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["verify"]),
      decodeBytes(parts[1]),
      new TextEncoder().encode(parts[0]),
    )) return null;
    const payload = JSON.parse(new TextDecoder().decode(decodeBytes(parts[0]))) as { sub?: string; exp?: number };
    if (!payload.sub || !payload.exp || payload.exp <= Math.floor(Date.now() / 1000)) return null;
    return { id: payload.sub };
  } catch {
    return null;
  }
}

export const OWNER_SESSION_COOKIE = COOKIE_NAME;
export const OWNER_SESSION_MAX_AGE = SESSION_SECONDS;
