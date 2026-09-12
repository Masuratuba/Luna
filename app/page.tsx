import LunaVoice from "./components/LunaVoice";

export default function Home() {
  return (
    <main className="luna-shell luna-home">
      <div className="luna-background" aria-hidden="true" />
      <div className="luna-overlay" />

      <section className="luna-home-screen">
        <nav className="luna-minimal-nav" aria-label="LUNA Navigation">
          <button className="luna-menu-button" type="button" aria-label="Menü öffnen">
            <span />
            <span />
            <span />
          </button>
          <div className="luna-mini-mark" aria-label="LUNA">
            <span>L</span>
            <i />
          </div>
        </nav>

        <header className="luna-home-brand" aria-label="LUNA">
          <div className="luna-home-wordmark">LUNA</div>
          <div className="luna-home-subtitle">DEIN KI-BEGLEITER</div>
        </header>

        <div className="luna-home-space" aria-hidden="true" />

        <section className="luna-home-voice" aria-label="LUNA Voice">
          <LunaVoice
            agentId="luna"
            onConversationId={() => undefined}
            onMessage={() => undefined}
          />
        </section>

        <nav className="luna-bottom-nav" aria-label="LUNA Bereiche">
          <a className="active" href="#voice"><span>◌</span><small>Voice</small></a>
          <a href="#projekte"><span>□</span><small>Projekte</small></a>
          <a href="#tools"><span>⌘</span><small>Tools</small></a>
          <a href="#mehr"><span>•••</span><small>Mehr</small></a>
        </nav>
      </section>
    </main>
  );
}
