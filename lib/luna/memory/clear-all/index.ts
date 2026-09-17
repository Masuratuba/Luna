import type { SupabaseClient } from "@supabase/supabase-js";

export type ClearAllMemoriesResult =
  | { ok: true; deletedCount: number }
  | { ok: false; reason: "NOT_CONFIRMED" };

const CLEAR_ALL_PATTERN = /^\s*(?:bitte\s+)?(?:vergiss|vergiß|lösche|loesche)(?:\s*,)?\s+(?:bitte\s+)?(?:alle(?:\s+meine)?\s+(?:erinnerungen|memories)|alles(?:\s*,?\s*(?:was\s+du\s+dir\s+über\s+mich\s+gemerkt\s+hast|was\s+du\s+über\s+mich\s+weißt))?)\s*[.!?]*\s*$/i;

export function isClearAllMemoriesRequest(message: string): boolean {
  return CLEAR_ALL_PATTERN.test(message);
}

export async function clearAllMemories(
  supabase: SupabaseClient<any, any, any>,
  userId: string,
): Promise<ClearAllMemoriesResult> {
  const { data, error } = await supabase
    .from("memories")
    .select("id")
    .eq("user_id", userId);

  if (error) throw error;

  const deletedCount = data?.length ?? 0;
  if (deletedCount === 0) return { ok: true, deletedCount: 0 };

  const { error: deleteError } = await supabase
    .from("memories")
    .delete()
    .eq("user_id", userId);

  if (deleteError) throw deleteError;

  return { ok: true, deletedCount };
}
