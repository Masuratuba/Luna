import { redirect } from "next/navigation";
import LunaChatSecure from "./components/LunaChatSecure";
import { createSupabaseServerClient } from "../lib/supabase/server";

export default async function Home() {
  const supabase = await createSupabaseServerClient();
  if (!supabase) redirect("/login?error=missing_supabase_config");

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: microsoftConnection } = await supabase
    .from("microsoft_connections")
    .select("account_email")
    .eq("user_id", user.id)
    .eq("provider", "microsoft-graph")
    .maybeSingle();

  const microsoftConnected = Boolean(microsoftConnection);
  const microsoftLabel = microsoftConnected
    ? `Microsoft verbunden${microsoftConnection?.account_email ? ` · ${microsoftConnection.account_email}` : ""}`
    : "Microsoft verbinden";

  return (
    <main className="luna-shell">
      <div className="luna-background" aria-hidden="true" />
      <div className="luna-overlay" />
      <section className="luna-content">
        <header className="luna-hero" aria-label="LUNA">
          <div className="luna-orbit luna-orbit-one" aria-hidden="true" />
          <div className="luna-orbit luna-orbit-two" aria-hidden="true" />
          <div className="luna-orb" aria-hidden="true">
            <div className="luna-orb-glow" />
            <div className="luna-orb-core" />
          </div>
          <div className="luna-wordmark">LUNA</div>
          <div className="luna-tagline">Deine digitale Begleiterin</div>
        </header>

        <p className="luna-status"><span /> Bereit</p>
        <div className="luna-integrations">
          <a className={`luna-microsoft-connect${microsoftConnected ? " connected" : ""}`} href="/api/integrations/microsoft/start">
            {microsoftLabel}
          </a>
        </div>
        <LunaChatSecure />
      </section>
    </main>
  );
}
