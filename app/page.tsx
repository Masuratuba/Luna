import { redirect } from "next/navigation";
import LunaChatSecure from "./components/LunaChatSecure";
import { createSupabaseServerClient } from "../lib/supabase/server";
import { lunaAgents } from "../lib/luna/agents";

const agentIcons: Record<string, string> = {
  luna: "✦",
  research: "⌕",
  memory: "◌",
  planner: "◫",
  action: "↗",
  security: "◈",
  document: "▤",
  coding: "⌘",
  analysis: "Σ",
  shop: "◇",
};

const agentAccent: Record<string, string> = {
  luna: "violet",
  research: "blue",
  memory: "silver",
  planner: "cyan",
  action: "green",
  security: "amber",
  document: "indigo",
  coding: "pink",
  analysis: "sky",
  shop: "gold",
};

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
        <nav className="luna-topbar" aria-label="LUNA Navigation">
          <a className="luna-nav-brand" href="#top" aria-label="LUNA Startseite"><span>◐</span> LUNA</a>
          <div className="luna-nav-links">
            <a className="active" href="#chat">Chat</a>
            <a href="#workspace">Projekte</a>
            <a href="#agents">Agenten</a>
            <a href="#tools">Tools</a>
          </div>
          <a className="luna-nav-profile" href="#profile" aria-label="Profil">◯</a>
        </nav>

        <header id="top" className="luna-hero" aria-label="LUNA">
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

        <section id="workspace" className="luna-workspace" aria-label="LUNA Arbeitsbereich">
          <a className="luna-work-card primary" href="#chat">
            <span className="work-icon">✦</span>
            <span><strong>Neuer Chat</strong><small>Mit LUNA arbeiten</small></span>
            <b>→</b>
          </a>
          <a className="luna-work-card" href="#agents">
            <span className="work-icon">◈</span>
            <span><strong>Agenten</strong><small>{lunaAgents.length} Spezialisten verfügbar</small></span>
            <b>→</b>
          </a>
          <a className="luna-work-card" href="#tools">
            <span className="work-icon">⌘</span>
            <span><strong>Tools & Aufgaben</strong><small>Recherche, Memory, Planung & Aktionen</small></span>
            <b>→</b>
          </a>
        </section>

        <section id="chat" className="luna-chat-section" aria-label="LUNA Chat">
          <div className="luna-section-heading">
            <div><span className="eyebrow">CONVERSATION</span><h2>Chat mit LUNA</h2></div>
            <span className="luna-live-pill"><i /> Online</span>
          </div>
          <LunaChatSecure />
        </section>

        <section id="agents" className="luna-agents-section" aria-label="LUNA Agenten">
          <div className="luna-section-heading">
            <div><span className="eyebrow">AGENT DIRECTOR</span><h2>Deine Agenten</h2></div>
            <span className="section-count">{lunaAgents.length} aktiv</span>
          </div>
          <div className="luna-agent-grid">
            {lunaAgents.map((agent) => (
              <a className={`luna-agent-card ${agentAccent[agent.id] ?? "blue"}`} href="#chat" key={agent.id} id={`agent-${agent.id}`} aria-label={`${agent.name} auswählen`}>
                <span className="agent-icon">{agentIcons[agent.id] ?? "✦"}</span>
                <span className="agent-copy"><strong>{agent.name}</strong><small>{agent.description}</small></span>
                <span className="agent-arrow">→</span>
              </a>
            ))}
          </div>
        </section>

        <section id="tools" className="luna-tools-strip" aria-label="LUNA Fähigkeiten">
          <span><i>⌕</i> Recherche</span>
          <span><i>◌</i> Memory</span>
          <span><i>◫</i> Planung</span>
          <span><i>✓</i> Aufgaben</span>
          <span><i>▤</i> Dokumente</span>
          <span><i>⌘</i> Coding</span>
          <span><i>◈</i> Guardian</span>
        </section>

        <footer id="profile" className="luna-footer">
          <span>LUNA · Personal AI Assistant</span>
          <span className="footer-status"><i /> System bereit</span>
        </footer>
      </section>
    </main>
  );
}
