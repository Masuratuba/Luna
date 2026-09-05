import { createCipheriv, createDecipheriv, createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { createSupabaseServiceClient } from "../supabase/server";

const AUTHORITY = "https://login.microsoftonline.com/common/oauth2/v2.0";
const GRAPH = "https://graph.microsoft.com/v1.0";
const STATE_COOKIE = "luna_ms_oauth_state";
const STATE_TTL_SECONDS = 10 * 60;
const TOKEN_TIMEOUT_MS = 15_000;

function env(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name}_NOT_CONFIGURED`);
  return value;
}

function encryptionKey(): Buffer {
  const raw = env("LUNA_TOKEN_ENCRYPTION_KEY");
  const key = Buffer.from(raw, "base64");
  if (key.length !== 32) throw new Error("LUNA_TOKEN_ENCRYPTION_KEY_INVALID");
  return key;
}

function encrypt(value: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", encryptionKey(), iv);
  const ciphertext = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  return [iv.toString("base64url"), cipher.getAuthTag().toString("base64url"), ciphertext.toString("base64url")].join(".");
}

function decrypt(value: string): string {
  const [ivRaw, tagRaw, ciphertextRaw] = value.split(".");
  if (!ivRaw || !tagRaw || !ciphertextRaw) throw new Error("MICROSOFT_TOKEN_CIPHERTEXT_INVALID");
  const decipher = createDecipheriv("aes-256-gcm", encryptionKey(), Buffer.from(ivRaw, "base64url"));
  decipher.setAuthTag(Buffer.from(tagRaw, "base64url"));
  return Buffer.concat([decipher.update(Buffer.from(ciphertextRaw, "base64url")), decipher.final()]).toString("utf8");
}

function signState(value: string): string {
  return createHmac("sha256", encryptionKey()).update(value).digest("base64url");
}

export function createMicrosoftOAuthState(): { value: string; cookieValue: string } {
  const nonce = randomBytes(32).toString("base64url");
  return { value: nonce, cookieValue: `${nonce}.${signState(nonce)}` };
}

export function verifyMicrosoftOAuthState(value: string | undefined, cookieValue: string | undefined): boolean {
  if (!value || !cookieValue) return false;
  const [nonce, signature] = cookieValue.split(".");
  if (!nonce || !signature || nonce !== value) return false;
  const expected = Buffer.from(signState(nonce));
  const actual = Buffer.from(signature);
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

export function microsoftOAuthCookieOptions() {
  return { httpOnly: true, secure: true, sameSite: "lax" as const, path: "/", maxAge: STATE_TTL_SECONDS };
}

export function microsoftAuthorizationUrl(state: string): string {
  const params = new URLSearchParams({
    client_id: env("MICROSOFT_GRAPH_CLIENT_ID"),
    response_type: "code",
    redirect_uri: env("MICROSOFT_GRAPH_REDIRECT_URI"),
    response_mode: "query",
    scope: "openid profile email User.Read Mail.Read Mail.Send offline_access",
    state,
    prompt: "consent",
  });
  return `${AUTHORITY}/authorize?${params.toString()}`;
}

type TokenResponse = { access_token: string; refresh_token?: string; expires_in: number; scope?: string; token_type?: string };

async function tokenRequest(params: URLSearchParams): Promise<TokenResponse> {
  const response = await fetch(`${AUTHORITY}/token`, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: params.toString(),
    signal: AbortSignal.timeout(TOKEN_TIMEOUT_MS),
  });
  if (!response.ok) throw new Error(`MICROSOFT_TOKEN_HTTP_${response.status}`);
  const data = await response.json() as Partial<TokenResponse>;
  if (typeof data.access_token !== "string" || typeof data.expires_in !== "number") throw new Error("MICROSOFT_TOKEN_RESPONSE_INVALID");
  return data as TokenResponse;
}

export async function exchangeMicrosoftCode(code: string): Promise<TokenResponse> {
  return tokenRequest(new URLSearchParams({
    client_id: env("MICROSOFT_GRAPH_CLIENT_ID"),
    client_secret: env("MICROSOFT_GRAPH_CLIENT_SECRET"),
    code,
    redirect_uri: env("MICROSOFT_GRAPH_REDIRECT_URI"),
    grant_type: "authorization_code",
    scope: "openid profile email User.Read Mail.Read Mail.Send offline_access",
  }));
}

async function graphMe(accessToken: string): Promise<{ id?: string; mail?: string; userPrincipalName?: string }> {
  const response = await fetch(`${GRAPH}/me?$select=id,mail,userPrincipalName`, { headers: { accept: "application/json", authorization: `Bearer ${accessToken}` }, signal: AbortSignal.timeout(TOKEN_TIMEOUT_MS) });
  if (!response.ok) throw new Error(`MICROSOFT_GRAPH_ME_HTTP_${response.status}`);
  return response.json() as Promise<{ id?: string; mail?: string; userPrincipalName?: string }>;
}

export async function saveMicrosoftConnection(userId: string, token: TokenResponse): Promise<void> {
  const supabase = createSupabaseServiceClient();
  if (!supabase) throw new Error("SUPABASE_NOT_CONFIGURED");
  if (!token.refresh_token) throw new Error("MICROSOFT_REFRESH_TOKEN_MISSING");
  const me = await graphMe(token.access_token);
  const expiresAt = new Date(Date.now() + Math.max(60, token.expires_in - 60) * 1000).toISOString();
  const { error } = await supabase.from("microsoft_connections").upsert({
    user_id: userId,
    provider: "microsoft-graph",
    microsoft_user_id: me.id ?? null,
    account_email: me.mail ?? me.userPrincipalName ?? null,
    access_token_encrypted: encrypt(token.access_token),
    refresh_token_encrypted: encrypt(token.refresh_token),
    access_token_expires_at: expiresAt,
    scopes: (token.scope ?? "User.Read Mail.Read Mail.Send offline_access").split(" ").filter(Boolean),
    updated_at: new Date().toISOString(),
  }, { onConflict: "user_id,provider" });
  if (error) throw new Error("MICROSOFT_CONNECTION_SAVE_FAILED");
}

export async function getMicrosoftGraphAccessToken(userId: string): Promise<string> {
  const supabase = createSupabaseServiceClient();
  if (!supabase) throw new Error("SUPABASE_NOT_CONFIGURED");
  const { data, error } = await supabase.from("microsoft_connections").select("access_token_encrypted,refresh_token_encrypted,access_token_expires_at").eq("user_id", userId).eq("provider", "microsoft-graph").maybeSingle();
  if (error) throw new Error("MICROSOFT_CONNECTION_READ_FAILED");
  if (!data) throw new Error("MICROSOFT_NOT_CONNECTED");
  if (new Date(data.access_token_expires_at).getTime() > Date.now() + 60_000) return decrypt(data.access_token_encrypted);

  const refreshToken = decrypt(data.refresh_token_encrypted);
  const refreshed = await tokenRequest(new URLSearchParams({
    client_id: env("MICROSOFT_GRAPH_CLIENT_ID"),
    client_secret: env("MICROSOFT_GRAPH_CLIENT_SECRET"),
    grant_type: "refresh_token",
    refresh_token: refreshToken,
    scope: "openid profile email User.Read Mail.Read Mail.Send offline_access",
  }));
  const nextRefresh = refreshed.refresh_token ?? refreshToken;
  const expiresAt = new Date(Date.now() + Math.max(60, refreshed.expires_in - 60) * 1000).toISOString();
  const { error: updateError } = await supabase.from("microsoft_connections").update({
    access_token_encrypted: encrypt(refreshed.access_token),
    refresh_token_encrypted: encrypt(nextRefresh),
    access_token_expires_at: expiresAt,
    updated_at: new Date().toISOString(),
  }).eq("user_id", userId).eq("provider", "microsoft-graph");
  if (updateError) throw new Error("MICROSOFT_CONNECTION_REFRESH_SAVE_FAILED");
  return refreshed.access_token;
}

export const microsoftOAuthConfig = { stateCookie: STATE_COOKIE };
export const microsoftCrypto = { encrypt, decrypt, hash: (value: string) => createHash("sha256").update(value).digest("hex") };
