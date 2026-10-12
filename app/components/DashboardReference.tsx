"use client";

import { useEffect, useState } from "react";
import LunaChatSecure from "./LunaChatSecure";
import { lunaAgents, type LunaAgentId } from "../../lib/luna/agents";

type Props = { initialAgentId: LunaAgentId };
type TaskItem = { id?: string; title?: string; name?: string; status?: string };
type Counts = { tasks: TaskItem[]; projects: number; memories: number };

const navItems = [
  ["◉", "Chat", "#chat"], ["☑", "Aufgaben", "#tasks"], ["♙", "Agenten", "#agents"],
  ["▦", "Projekte", "#projects"], ["✧", "Memory", "#memory"], ["⌘", "Tools", "#tools"],
];

async function readJson(url: string) {
  try {
    const response = await fetch(url, { cache: "no-store" });
    if (!response.ok) return {};
    return await response.json();
  } catch { return {}; }
}

export default function DashboardReference({ initialAgentId }: Props) {
  const [counts, setCounts] = useState<Counts>({ tasks: [], projects: 0, memories: 0 });
  const [loading, setLoading] = useState(true);
  const [today, setToday] = useState("");
  const [active, setActive] = useState("Chat");

  useEffect(() => {
    setToday(new Intl.DateTimeFormat("de-DE", { day: "2-digit", month: "long", year: "numeric" }).format(new Date()));
    let mounted = true;
    Promise.all([readJson("/api/tasks"), readJson("/api/projects"), readJson("/api/memory")]).then(([tasks, projects, memories]) => {
      if (!mounted) return;
      setCounts({
        tasks: Array.isArray(tasks.tasks) ? tasks.tasks : Array.isArray(tasks.data) ? tasks.data : [],
        projects: Array.isArray(projects.projects) ? projects.projects.length : 0,
        memories: Array.isArray(memories.memories) ? memories.memories.length : 0,
      });
      setLoading(false);
    });
    return () => { mounted = false; };
  }, []);

  return (
    <main className="lr-app" id="top">
      <aside className="lr-sidebar">
        <a href="#top" className="lr-brand"><span className="lr-moon">◐</span><b>LUNA</b></a>
        <div className="lr-nav-label">ARBEITSBEREICH</div>
        {navItems.map(([icon, label, href]) => <a key={label} href={href} onClick={() => setActive(label)} className={active === label ? "lr-nav active" : "lr-nav"}><span>{icon}</span><em>{label}</em></a>)}
        <div className="lr-side-bottom"><a className="lr-nav" href="#settings"><span>⚙</span><em>Einstellungen</em></a><div className="lr-online"><i /> System bereit</div></div>
      </aside>
      <div className="lr-main">
        <header className="lr-topline"><div><span className="lr-kicker">PERSONAL AI WORKSPACE</span><h1>Dein Luna-Dashboard</h1></div><div className="lr-top-actions"><span className="lr-date">{today}</span><span className="lr-avatar">L</span></div></header>
        <section className="lr-hero" aria-label="Luna Weltraum-Header">
          <div className="lr-stars" aria-hidden="true" /><div className="lr-nebula" aria-hidden="true" />
          <div className="lr-orbit lr-orbit-a" /><div className="lr-orbit lr-orbit-b" />
          <div className="lr-planet"><div /></div><div className="lr-shooting-star" />
          <div className="lr-hero-copy"><span className="lr-kicker">DEIN KI-PARTNER</span><h2>LUNA</h2><p>Dein KI-Partner für alles, was wichtig ist</p></div>
          <div className="lr-hero-status"><i /> Bereit</div>
        </section>
        <section className="lr-chat-panel" id="chat"><div className="lr-panel-head"><div><span className="lr-kicker">KONVERSATION</span><h2>Sprich mit Luna</h2></div><span className="lr-live">Online</span></div><LunaChatSecure initialAgentId={initialAgentId} /></section>
        <section className="lr-quick-grid" aria-label="Schnellzugriff">
          <a href="#tasks" className="lr-quick"><span className="lr-icon blue">☑</span><span><b>Aufgaben</b><small>{loading ? "Lade Daten …" : counts.tasks.length + " Einträge"}</small></span><strong>→</strong></a>
          <a href="#agents" className="lr-quick"><span className="lr-icon purple">♙</span><span><b>Agenten</b><small>{lunaAgents.length} Spezialisten</small></span><strong>→</strong></a>
          <a href="#projects" className="lr-quick"><span className="lr-icon cyan">▦</span><span><b>Projekte</b><small>{loading ? "Lade Daten …" : counts.projects + " Einträge"}</small></span><strong>→</strong></a>
          <a href="#memory" className="lr-quick"><span className="lr-icon green">✧</span><span><b>Memory</b><small>{loading ? "Lade Daten …" : counts.memories + " Erinnerungen"}</small></span><strong>→</strong></a>
        </section>
        <section className="lr-lower-grid">
          <article className="lr-panel" id="tasks"><div className="lr-panel-head"><div><span className="lr-kicker">ÜBERSICHT</span><h2>Aufgaben</h2></div><a className="lr-text-link" href="#chat">Mit Luna planen ↗</a></div>
            {loading ? <p className="lr-muted">Daten werden geladen …</p> : counts.tasks.length ? <ul className="lr-task-list">{counts.tasks.slice(0, 6).map((task, i) => <li key={String(task.id ?? i)}><span className="lr-check">○</span><span>{task.title ?? task.name ?? "Aufgabe"}</span><small>{task.status ?? "Offen"}</small></li>)}</ul> : <div className="lr-empty"><span>☑</span><b>Deine Aufgaben erscheinen hier</b><p>Melde dich an und speichere Aufgaben in Luna, damit sie hier erscheinen.</p></div>}
          </article>
          <article className="lr-panel" id="agents"><div className="lr-panel-head"><div><span className="lr-kicker">SPEZIALISTEN</span><h2>Agenten</h2></div><span className="lr-count">{lunaAgents.length} verfügbar</span></div>
            <div className="lr-agent-list">{lunaAgents.slice(0, 8).map((agent, i) => <a key={agent.id} href={"/?agent=" + encodeURIComponent(agent.id) + "#chat"}><span className={"lr-agent-mark tone-" + (i % 5)}>{["✦","⌕","◌","◫","⌘"][i % 5]}</span><span><b>{agent.name}</b><small>{agent.description}</small></span><span className="lr-arrow">↗</span></a>)}</div>
          </article>
          <article className="lr-panel" id="projects"><div className="lr-panel-head"><div><span className="lr-kicker">IN ARBEIT</span><h2>Projekte</h2></div><a className="lr-text-link" href="#chat">Projekt mit Luna besprechen ↗</a></div><div className="lr-stat-line"><span>Gespeicherte Projekte</span><b>{loading ? "…" : counts.projects}</b></div><div className="lr-progress"><span style={{ width: counts.projects ? "70%" : "4%" }} /></div><p className="lr-muted">Die Anzahl wird live aus deinem Luna-Konto geladen.</p></article>
          <article className="lr-panel" id="memory"><div className="lr-panel-head"><div><span className="lr-kicker">GEDÄCHTNIS</span><h2>Memory</h2></div><a className="lr-text-link" href="#chat">Erinnerung mit Luna speichern ↗</a></div><div className="lr-memory-count"><span className="lr-icon purple">✧</span><div><b>{loading ? "…" : counts.memories}</b><small>gespeicherte Erinnerungen</small></div></div><p className="lr-muted">Memory wird über die geschützte Luna-Sitzung geladen.</p></article>
        </section>
        <section className="lr-tools" id="tools"><div><span className="lr-kicker">FÄHIGKEITEN</span><h2>Deine Luna-Werkzeuge</h2></div><div className="lr-tool-chips"><a href="#chat">⌕ Recherche</a><a href="#memory">✧ Memory</a><a href="#tasks">☑ Aufgaben</a><a href="#projects">▦ Projekte</a><span>◈ Guardian</span><span>▤ Dokumente</span></div></section>
        <footer className="lr-footer" id="settings"><span>◐ LUNA · Personal AI Assistant</span><span><i /> Geschützte Datenverarbeitung</span></footer>
      </div>
    </main>
  );
}
