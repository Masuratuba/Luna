import { redirect } from "next/navigation";
import LunaChatSecure from "./components/LunaChatSecure";
import { createSupabaseServerClient } from "../lib/supabase/server";

export default async function Home() {
  const supabase = await createSupabaseServerClient();
  if (!supabase) redirect("/login?error=missing_supabase_config");

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  return (
    <main className="luna-shell">
      <div className="luna-background" aria-hidden="true" />
      <div className="luna-overlay" />
      <section className="luna-content">
        <header className="luna-brand">🌙 LUNA</header>
        <p className="luna-status"><span /> Bereit</p>
        <LunaChatSecure />
      </section>
    </main>
  );
}
