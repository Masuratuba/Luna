import type { SupabaseClient } from "@supabase/supabase-js";

export type ForgetMemoryResult =
  | { ok: true; deleted: boolean; memoryId: string | null; target: string }
  | { ok: false; reason: "NO_TARGET" | "NOT_FOUND" };

const FORGET_PREFIX = /^\s*(?:bitte\s+)?(?:vergiss|vergiß|lösche|loesche)\s+(?:bitte\s+)?(?:dass\s+)?(?:du\s+)?(?:dir\s+)?/i;

export function extractForgetTarget(message: string): string | null {
  const target = message.replace(FORGET_PREFIX, "").trim().replace(/[.!?]+$/, "").trim();
  return target ? target.slice(0, 10_000) : null;
}

export function isForgetMemoryRequest(message: string): boolean {
  return /^\s*(?:bitte\s+)?(?:vergiss|vergiß|lösche|loesche)\b/i.test(message);
}

export async function forgetMemory(
  supabase: SupabaseClient<any, any, any>,
  userId: string,
  message: string,
): Promise<ForgetMemoryResult> {
  const target = extractForgetTarget(message);
  if (!target) return { ok: false, reason: "NO_TARGET" };

  const { data: existing, error: lookupError } = await supabase
    .from("memories")
    .select("id, content")
    .eq("user_id", userId)
    .eq("content", target)
    .maybeSingle();

  if (lookupError) throw lookupError;
  if (!existing) return { ok: false, reason: "NOT_FOUND" };

  const { error: deleteError } = await supabase
    .from("memories")
    .delete()
    .eq("user_id", userId)
    .eq("id", existing.id);

  if (deleteError) throw deleteError;

  return { ok: true, deleted: true, memoryId: existing.id, target };
}
