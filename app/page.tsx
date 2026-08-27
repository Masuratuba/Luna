import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import LunaChatSecure from "./components/LunaChatSecure";

export default async function Home() {
  const supabase = await createSupabaseServerClient();
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
