import type { SupabaseClient } from "@supabase/supabase-js";
import { containsSensitiveMemory, normalizeMemory } from "..";

export type UpdateMemoryResult =
  | { ok: true; memoryId: string; previousContent: string; content: string }
  | { ok: false; reason: "NO_TARGET" | "NO_REPLACEMENT" | "SENSITIVE" | "NOT_FOUND" };

const UPDATE_PREFIX = /^\s*(?:luna\s*[, ]+)?(?:bitte\s+)?(?:aktualisiere|ändere|aendere|ersetze|korrigiere)(?:\s*,)?\s+/i;

export function parseMemoryUpdate(message: string): { target: string; replacement: string } | null {
  const text = message.trim();
  const match = text.match(UPDATE_PREFIX);
  if (!match) return null;
  const rest = text.slice(match[0].length).trim().replace(/[.!?]+$/, "").trim();
  const parts = rest.match(/^(.+?)\s+(?:zu|auf|mit)\s+(.+)$/i);
  if (!parts) return null;
  const target = parts[1].trim().slice(0, 500);
  const replacement = parts[2].trim().slice(0, 10_000);
  return target && replacement ? { target, replacement } : null;
}

export async function updateMemory(
  supabase: SupabaseClient<any, any, any>,
  userId: string,
  message: string,
): Promise<UpdateMemoryResult> {
  const parsed = parseMemoryUpdate(message);
  if (!parsed?.target) return { ok: false, reason: "NO_TARGET" };
  if (!parsed.replacement) return { ok: false, reason: "NO_REPLACEMENT" };
  if (containsSensitiveMemory(parsed.replacement)) return { ok: false, reason: "SENSITIVE" };

  const { data: matches, error: lookupError } = await supabase
    .from("memories")
    .select("id, content")
    .eq("user_id", userId)
    .ilike("content", `%${parsed.target}%`)
    .limit(5);

  if (lookupError) throw lookupError;
  if (!matches?.length) return { ok: false, reason: "NOT_FOUND" };

  const target = matches[0];
  const normalized = normalizeMemory({ type: "fact", content: parsed.replacement, importance: 0.7 });
  const { data, error: updateError } = await supabase
    .from("memories")
    .update({ content: normalized.content, updated_at: new Date().toISOString() })
    .eq("id", target.id)
    .eq("user_id", userId)
    .select("id, content")
    .single();

  if (updateError) throw updateError;
  return { ok: true, memoryId: data.id, previousContent: target.content, content: data.content };
}
