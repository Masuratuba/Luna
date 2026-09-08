import { createHash, randomUUID } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";

const DEFAULT_TTL_MS = 5 * 60 * 1000;

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function approvalActionKey(action: string, payload: unknown): string {
  const normalized = JSON.stringify(payload, Object.keys((payload && typeof payload === "object" && !Array.isArray(payload)) ? payload as Record<string, unknown> : {}).sort());
  return `${action}:${hashToken(normalized ?? "")}`;
}

export async function createDurableApproval(
  supabase: SupabaseClient,
  userId: string,
  actionKey: string,
  reason: string,
  ttlMs = DEFAULT_TTL_MS,
) {
  if (!Number.isFinite(ttlMs) || ttlMs <= 0 || ttlMs > 15 * 60 * 1000) throw new Error("APPROVAL_TTL_INVALID");
  const token = randomUUID();
  const now = Date.now();
  const { data, error } = await supabase.from("luna_approvals").insert({
    user_id: userId,
    action_key: actionKey,
    reason: reason.trim().slice(0, 1000),
    token_hash: hashToken(token),
    status: "pending",
    expires_at: new Date(now + ttlMs).toISOString(),
  }).select("id, status, created_at, expires_at").single();
  if (error) throw error;
  return { ...data, token };
}

export async function approveDurableApproval(
  supabase: SupabaseClient,
  userId: string,
  id: string,
  token: string,
) {
  const now = new Date().toISOString();
  const { data, error } = await supabase.from("luna_approvals")
    .update({ status: "approved", approved_at: now })
    .eq("id", id)
    .eq("user_id", userId)
    .eq("token_hash", hashToken(token))
    .eq("status", "pending")
    .gt("expires_at", now)
    .select("id, action_key, status, expires_at")
    .maybeSingle();
  if (error) throw error;
  if (!data) throw new Error("APPROVAL_INVALID");
  return data;
}

export async function consumeDurableApproval(
  supabase: SupabaseClient,
  userId: string,
  id: string,
  token: string,
  actionKey: string,
) {
  const now = new Date().toISOString();
  const { data, error } = await supabase.from("luna_approvals")
    .update({ status: "consumed", consumed_at: now })
    .eq("id", id)
    .eq("user_id", userId)
    .eq("token_hash", hashToken(token))
    .eq("action_key", actionKey)
    .eq("status", "approved")
    .gt("expires_at", now)
    .select("id, action_key, status")
    .maybeSingle();
  if (error) throw error;
  if (!data) throw new Error("APPROVAL_INVALID_OR_CONSUMED");
  return data;
}
