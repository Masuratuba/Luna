import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "../lib/supabase/server";
import LunaChatSecure from "./components/LunaChatSecure";

export default async function Home() {
  const supabase = await createSupabaseServerClient();

  // Keep the production page renderable even if Vercel is missing Supabase env vars.
  // This prevents a server-side exception from taking down the whole deployment.
  if (!supabase) {
    return (
      <main className="luna-shell">
        <div className="luna-background" aria-hidden="true" />
        <div className="luna-overlay" />
        <section className="luna-content">
          <header className="luna-brand">🌙 LUNA</header>
          <div className="luna-panel">
            <h1>Konfiguration fehlt</h1>
            <p>Die Supabase-Umgebungsvariablen sind in Vercel noch nicht gesetzt.</p>
          </div>
        </section>
      </main>
    );
  }

  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) redirect("/login");
  } catch {
    redirect("/login");
  }

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
