import LunaVoice from "./components/LunaVoice";

export default function Home() {
  return (
    <main className="luna-shell luna-home">
      <div className="luna-background" aria-hidden="true" />
      <div className="luna-overlay" />

      <section className="luna-home-screen" id="top">
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

        <section className="luna-home-voice" id="voice" aria-label="LUNA Voice">
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

      <style>{`
        .luna-home { min-height: 100svh; height: 100svh; overflow: hidden; background: #03050a; }
        .luna-home-screen { position: relative; width: 100%; height: 100%; min-height: 100svh; display: flex; flex-direction: column; align-items: center; padding: max(18px, env(safe-area-inset-top)) 18px max(16px, env(safe-area-inset-bottom)); }
        .luna-minimal-nav { position: absolute; z-index: 5; top: max(18px, env(safe-area-inset-top)); left: 18px; right: 18px; display: flex; align-items: center; justify-content: space-between; pointer-events: none; }
        .luna-menu-button, .luna-mini-mark { pointer-events: auto; }
        .luna-menu-button { width: 42px; height: 42px; display: flex; flex-direction: column; justify-content: center; gap: 5px; padding: 0 10px; border: 1px solid rgba(255,255,255,.16); border-radius: 13px; background: rgba(3,7,13,.42); backdrop-filter: blur(13px); box-shadow: 0 8px 28px rgba(0,0,0,.25); cursor: pointer; }
        .luna-menu-button span { display: block; width: 19px; height: 1.5px; margin: 0 auto; border-radius: 2px; background: rgba(235,246,255,.9); }
        .luna-mini-mark { position: relative; width: 40px; height: 40px; display: grid; place-items: center; border: 1px solid rgba(222,239,255,.5); border-radius: 50%; color: #eaf5ff; background: rgba(4,9,16,.38); backdrop-filter: blur(12px); box-shadow: 0 0 22px rgba(105,177,236,.12); font-size: 18px; font-weight: 300; }
        .luna-mini-mark i { position: absolute; width: 7px; height: 7px; top: 3px; right: 2px; border-radius: 50%; background: #46d369; box-shadow: 0 0 10px rgba(70,211,105,.85); }
        .luna-home-brand { position: relative; z-index: 2; margin-top: clamp(88px, 13vh, 125px); text-align: center; text-shadow: 0 5px 30px rgba(0,0,0,.8); }
        .luna-home-wordmark { font-size: clamp(46px, 13vw, 72px); line-height: .95; font-weight: 500; letter-spacing: .22em; padding-left: .22em; color: #f3f7ff; }
        .luna-home-subtitle { margin-top: 13px; color: rgba(224,239,255,.66); font-size: 9px; letter-spacing: .34em; }
        .luna-home-space { flex: 1; width: 100%; min-height: 0; }
        .luna-home-voice { position: relative; z-index: 4; width: 100%; display: flex; justify-content: center; margin-bottom: clamp(28px, 5vh, 46px); }
        .luna-bottom-nav { position: relative; z-index: 5; width: min(390px, 100%); display: grid; grid-template-columns: repeat(4, 1fr); align-items: end; padding: 10px 5px max(4px, env(safe-area-inset-bottom)); border-top: 1px solid rgba(255,255,255,.08); background: linear-gradient(180deg, rgba(2,5,10,.03), rgba(2,5,10,.35)); }
        .luna-bottom-nav a { display: flex; flex-direction: column; align-items: center; gap: 5px; color: rgba(232,243,255,.55); text-decoration: none; font-size: 18px; }
        .luna-bottom-nav a.active { color: #e9f7ff; text-shadow: 0 0 16px rgba(112,201,255,.55); }
        .luna-bottom-nav small { font-size: 9px; letter-spacing: .04em; }
        .luna-bottom-nav a:nth-child(n+2) { opacity: .62; }
        @media (min-width: 700px) {
          .luna-home-screen { max-width: 520px; margin: 0 auto; }
          .luna-minimal-nav { left: 0; right: 0; }
        }
      `}</style>
    </main>
  );
}
