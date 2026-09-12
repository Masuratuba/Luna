"use client";

import { useState } from "react";
import LunaVoice from "./components/LunaVoice";
import { lunaAgents, type LunaAgentId } from "../lib/luna/agents";

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

export default function Home() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [agentId, setAgentId] = useState<LunaAgentId>("luna");
  const [conversationId, setConversationId] = useState<string>();
  const activeAgent = lunaAgents.find((agent) => agent.id === agentId) ?? lunaAgents[0];

  function selectAgent(nextAgentId: LunaAgentId) {
    setAgentId(nextAgentId);
    setConversationId(undefined);
    setMenuOpen(false);
  }

  return (
    <main className="luna-shell luna-home">
      <div className="luna-background" aria-hidden="true" />
      <div className="luna-overlay" />

      <section className="luna-home-screen" id="top">
        <nav className="luna-minimal-nav" aria-label="LUNA Navigation">
          <button className={`luna-menu-button ${menuOpen ? "open" : ""}`} type="button" aria-label={menuOpen ? "Menü schließen" : "Menü öffnen"} aria-expanded={menuOpen} onClick={() => setMenuOpen((open) => !open)}>
            <span /><span /><span />
          </button>
          <div className="luna-mini-mark" aria-label="LUNA"><span>L</span><i /></div>
        </nav>

        <header className="luna-home-brand" aria-label="LUNA">
          <div className="luna-home-wordmark">LUNA</div>
          <div className="luna-home-subtitle">DEIN KI-BEGLEITER</div>
        </header>

        <div className="luna-home-space" aria-hidden="true" />

        <section className="luna-home-voice" id="voice" aria-label="LUNA Voice">
          <LunaVoice
            agentId={agentId}
            conversationId={conversationId}
            onConversationId={setConversationId}
            onMessage={() => undefined}
          />
        </section>
      </section>

      {menuOpen && (
        <div className="luna-menu-layer" role="dialog" aria-modal="true" aria-label="LUNA Agenten">
          <button className="luna-menu-backdrop" type="button" aria-label="Menü schließen" onClick={() => setMenuOpen(false)} />
          <aside className="luna-agent-drawer">
            <div className="luna-drawer-head">
              <div><span>AGENT DIRECTOR</span><h2>Deine Agenten</h2></div>
              <button type="button" onClick={() => setMenuOpen(false)} aria-label="Schließen">×</button>
            </div>
            <p className="luna-drawer-active">Aktiv: <strong>{activeAgent.name}</strong></p>
            <div className="luna-agent-list">
              {lunaAgents.map((agent) => (
                <button key={agent.id} type="button" className={`luna-agent-row ${agent.id === agentId ? "active" : ""}`} onClick={() => selectAgent(agent.id)}>
                  <span className="agent-icon">{agentIcons[agent.id] ?? "✦"}</span>
                  <span className="agent-copy"><strong>{agent.name}</strong><small>{agent.description}</small></span>
                  <span className="agent-check">{agent.id === agentId ? "✓" : "›"}</span>
                </button>
              ))}
            </div>
          </aside>
        </div>
      )}

      <style>{`
        .luna-home { min-height: 100svh; height: 100svh; overflow: hidden; background: #03050a; }
        .luna-home-screen { position: relative; width: 100%; height: 100%; min-height: 100svh; display: flex; flex-direction: column; align-items: center; padding: max(18px, env(safe-area-inset-top)) 18px max(16px, env(safe-area-inset-bottom)); }
        .luna-minimal-nav { position: absolute; z-index: 5; top: max(18px, env(safe-area-inset-top)); left: 18px; right: 18px; display: flex; align-items: center; justify-content: space-between; pointer-events: none; }
        .luna-menu-button, .luna-mini-mark { pointer-events: auto; }
        .luna-menu-button { width: 42px; height: 42px; display: flex; flex-direction: column; justify-content: center; gap: 5px; padding: 0 10px; border: 1px solid rgba(255,255,255,.16); border-radius: 13px; background: rgba(3,7,13,.42); backdrop-filter: blur(13px); box-shadow: 0 8px 28px rgba(0,0,0,.25); cursor: pointer; }
        .luna-menu-button span { display: block; width: 19px; height: 1.5px; margin: 0 auto; border-radius: 2px; background: rgba(235,246,255,.9); transition: transform .2s ease, opacity .2s ease; }
        .luna-menu-button.open span:nth-child(1) { transform: translateY(6.5px) rotate(45deg); }
        .luna-menu-button.open span:nth-child(2) { opacity: 0; }
        .luna-menu-button.open span:nth-child(3) { transform: translateY(-6.5px) rotate(-45deg); }
        .luna-mini-mark { position: relative; width: 40px; height: 40px; display: grid; place-items: center; border: 1px solid rgba(222,239,255,.5); border-radius: 50%; color: #eaf5ff; background: rgba(4,9,16,.38); backdrop-filter: blur(12px); box-shadow: 0 0 22px rgba(105,177,236,.12); font-size: 18px; font-weight: 300; }
        .luna-mini-mark i { position: absolute; width: 7px; height: 7px; top: 3px; right: 2px; border-radius: 50%; background: #46d369; box-shadow: 0 0 10px rgba(70,211,105,.85); }
        .luna-home-brand { position: relative; z-index: 2; margin-top: clamp(88px, 13vh, 125px); text-align: center; text-shadow: 0 5px 30px rgba(0,0,0,.8); }
        .luna-home-wordmark { font-size: clamp(46px, 13vw, 72px); line-height: .95; font-weight: 500; letter-spacing: .22em; padding-left: .22em; color: #f3f7ff; }
        .luna-home-subtitle { margin-top: 13px; color: rgba(224,239,255,.66); font-size: 9px; letter-spacing: .34em; }
        .luna-home-space { flex: 1; width: 100%; min-height: 0; }
        .luna-home-voice { position: relative; z-index: 4; width: 100%; display: flex; justify-content: center; margin-bottom: clamp(58px, 11vh, 100px); }
        .luna-menu-layer { position: fixed; inset: 0; z-index: 20; display: flex; }
        .luna-menu-backdrop { position: absolute; inset: 0; width: 100%; border: 0; background: rgba(0,0,0,.42); backdrop-filter: blur(4px); cursor: pointer; }
        .luna-agent-drawer { position: relative; z-index: 1; width: min(390px, 88vw); height: 100%; padding: max(22px, env(safe-area-inset-top)) 18px max(20px, env(safe-area-inset-bottom)); overflow-y: auto; background: rgba(5,9,18,.96); border-right: 1px solid rgba(255,255,255,.1); box-shadow: 20px 0 60px rgba(0,0,0,.45); }
        .luna-drawer-head { display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; margin-bottom: 12px; }
        .luna-drawer-head span { color: rgba(157,205,255,.55); font-size: 8px; letter-spacing: .22em; }
        .luna-drawer-head h2 { margin: 7px 0 0; color: #f3f7ff; font-size: 23px; font-weight: 500; }
        .luna-drawer-head > button { width: 38px; height: 38px; border: 1px solid rgba(255,255,255,.14); border-radius: 50%; background: rgba(255,255,255,.04); color: #eef8ff; font-size: 24px; cursor: pointer; }
        .luna-drawer-active { margin: 0 0 14px; padding: 9px 12px; border-radius: 10px; background: rgba(93,174,255,.07); color: rgba(224,239,255,.58); font-size: 11px; }
        .luna-drawer-active strong { color: #eef8ff; }
        .luna-agent-list { display: grid; gap: 8px; }
        .luna-agent-row { width: 100%; display: grid; grid-template-columns: 38px 1fr 20px; align-items: center; gap: 10px; padding: 12px; border: 1px solid rgba(255,255,255,.08); border-radius: 13px; background: rgba(255,255,255,.025); color: #eef8ff; text-align: left; cursor: pointer; }
        .luna-agent-row.active { border-color: rgba(102,204,255,.48); background: rgba(77,176,255,.09); box-shadow: inset 0 0 24px rgba(77,176,255,.04); }
        .luna-agent-row .agent-icon { width: 36px; height: 36px; display: grid; place-items: center; border-radius: 10px; background: rgba(255,255,255,.06); color: rgba(221,242,255,.9); font-size: 17px; }
        .luna-agent-row .agent-copy { min-width: 0; display: flex; flex-direction: column; gap: 3px; }
        .luna-agent-row .agent-copy strong { font-size: 12px; font-weight: 650; }
        .luna-agent-row .agent-copy small { color: rgba(224,239,255,.5); font-size: 9px; line-height: 1.35; }
        .luna-agent-row .agent-check { color: rgba(224,244,255,.6); text-align: right; font-size: 16px; }
        .luna-agent-row.active .agent-check { color: #68d4ff; }
        @media (min-width: 700px) { .luna-home-screen { max-width: 520px; margin: 0 auto; } .luna-minimal-nav { left: 0; right: 0; } }
      `}</style>
    </main>
  );
}
