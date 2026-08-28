import { createSupabaseServerClient } from "./server";

export async function requireUser() {
  const supabase = await createSupabaseServerClient();

  if (!supabase) {
    throw new Error("SUPABASE_NOT_CONFIGURED");
  }

  const { data, error } = await supabase.auth.getUser();

  if (error || !data.user) {
    throw new Error("UNAUTHORIZED");
  }

  return { supabase, user: data.user };
}
