import type { SupabaseClient } from "@supabase/supabase-js";

export async function resolveTestOwnerUserId(supabase: SupabaseClient): Promise<string> {
  const configured = process.env.LUNA_OWNER_USER_ID?.trim();
  if (configured) return configured;

  const { data, error } = await supabase.auth.admin.listUsers({ page: 1, perPage: 2 });
  if (error || data.users.length !== 1) throw new Error("TEST_USER_NOT_CONFIGURED");
  return data.users[0].id;
}
