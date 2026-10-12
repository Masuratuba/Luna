"use client";

import { useEffect, useState } from "react";
import LunaChatSecure from "./LunaChatSecure";
import { lunaAgents, type LunaAgentId } from "../../lib/luna/agents";

type Props = { initialAgentId: LunaAgentId };
type TaskItem = { id?: string; title?: string; name?: string; status?: string };
type ProjectItem = { id?: string; name?: string; status?: string };
type MemoryItem = { id?: string; content?: string; type?: string };
type Counts = { tasks: TaskItem[]; projects: ProjectItem[]; memories: MemoryItem[] };

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
  const [counts, setCounts] = useState<Counts>({ tasks: [], projects: [], memories: [] });
  const [loading, setLoading] = useState(true);
  const [today, setToday] = useState("");
  const [active, setActive] = useState("Chat");

  useEffect(() => {
    setToday(new Intl.DateTimeFormat("de-DE", { weekday: "long", day: "2-digit", month: "long" }).format(new Date()));
    let mounted = true;
    Promise.all([readJson("/api/tasks"), readJson("/api/projects"), readJson("/api/memory")]).then(([tasks, projects, memories]) => {
      if (!mounted) return;
      setCounts({
        tasks: Array.isArray(tasks.tasks) ? tasks.tasks : Array.isArray(tasks.data) ? tasks.data : [],
        projects: Array.isArray(projects.projects) ? projects.projects : [],
        memories: Array.isArray(memories.memories) ? memories.memories : [],
      });
      setLoading(false);
    });
    return () => { mounted = false; };
  }, []);

  return (
    <main className="lr-scene" id="top">
      <div className="lr-space-art" aria-hidden="true">
        <div className="lr-space-stars" />
        <div className="lr-space-cloud" />
        <div className="lr-space-orbit lr-space-orbit-one" />
        <div className="lr-space-orbit lr-space-orbit-two" />
        <div className="lr-space-planet"><span /></div>
        <div className="lr-space-asteroid lr-asteroid-one" />
        <div className="lr-space-asteroid lr-asteroid-two" />
        <div className="lr-space-asteroid lr-asteroid-three" />
        <div className="lr-space-meteor" />
      </div>
      <aside className="lr-sidebar">
        <a href="#top" className="lr-brand"><span className="lr-moon">◐</span><b>LUNA</b></a>
        <div className="lr-nav-label">WORKSPACE</div>
        {navItems.map(([icon, label, href]) => <a key={label} href={href} onClick={() => setActive(label)} className={active === label ? "lr-nav active" : "lr-nav"}><span>{icon}</span><em>{label}</em></a>)}
        <div className="lr-side-bottom"><a className="lr-nav" href="#settings"><span>⚙</span><em>Einstellungen</em></a><div className="lr-online"><i /> System bereit</div></div>
      </aside>

      <div className="lr-workspace">
        <header className="lr-topline">
          <div><span className="lr-kicker">DEIN PERSÖNLICHER KI-ASSISTENT</span><h1>Guten Tag. Was machen wir heute?</h1></div>
          <div className="lr-top-actions"><span className="lr-date">{today}</span><span className="lr-avatar">L</span></div>
        </header>

        <div className="lr-dashboard-grid">
          <section className="lr-center-column">
            <section className="lr-chat-panel" id="chat">
              <div className="lr-chat-intro"><span className="lr-status-pill"><i /> LUNA IST BEREIT</span><h2>Ich bin da.<br /><span>Womit kann ich dir helfen?</span></h2><p>Frag mich etwas, plane deinen nächsten Schritt oder starte eine Aufgabe.</p></div>
              <div className="lr-chat-live"><LunaChatSecure initialAgentId={initialAgentId} /></div>
            </section>

            <section className="lr-lower-grid">
              <article className="lr-panel" id="tasks">
                <div className="lr-panel-head"><div><span className="lr-kicker">DEIN TAG</span><h2>Aufgaben</h2></div><span className="lr-count">{loading ? "…" : counts.tasks.length + " gesamt"}</span></div>
                {loading ? <p className="lr-muted">Daten werden geladen …</p> : counts.tasks.length ? <ul className="lr-task-list">{counts.tasks.slice(0, 4).map((task, i) => <li key={String(task.id ?? i)}><span className="lr-check">○</span><span>{task.title ?? task.name ?? "Aufgabe"}</span><small>{task.status ?? "Offen"}</small></li>)}</ul> : <div className="lr-empty"><span>☑</span><b>Alles beginnt mit einem Plan</b><p>Deine gespeicherten Aufgaben erscheinen hier.</p></div>}
              </article>
              <article className="lr-panel" id="agents">
                <div className="lr-panel-head"><div><span className="lr-kicker">DEINE SPEZIALISTEN</span><h2>Agenten</h2></div><span className="lr-count">{lunaAgents.length} verfügbar</span></div>
                <div className="lr-agent-list">{lunaAgents.map((agent, i) => <a key={agent.id} href={"/?agent=" + encodeURIComponent(agent.id) + "#chat"}><span className={"lr-agent-mark tone-" + (i % 5)}>{["✦","⌕","◌","◫","⌘"][i % 5]}</span><span><b>{agent.name}</b><small>{agent.description}</small></span><span className="lr-arrow">↗</span></a>)}</div>
              </article>
              <article className="lr-panel" id="projects">
                <div className="lr-panel-head"><div><span className="lr-kicker">DEINE ARBEIT</span><h2>Projekte</h2></div><a className="lr-text-link" href="#chat">Öffnen ↗</a></div>
                <div className="lr-stat-line"><span>Gespeicherte Projekte</span><b>{loading ? "…" : counts.projects.length}</b></div><div className="lr-progress"><span style={{ width: counts.projects ? "70%" : "4%" }} /></div><p className="lr-muted">Behalte deine Vorhaben an einem Ort im Blick.</p>
              </article>
              <article className="lr-panel" id="memory">
                <div className="lr-panel-head"><div><span className="lr-kicker">WAS LUNA SICH MERKT</span><h2>Memory</h2></div><a className="lr-text-link" href="#chat">Mit Luna sprechen ↗</a></div>
                <div className="lr-memory-count"><span className="lr-icon purple">✧</span><div><b>{loading ? "…" : counts.memories.length}</b><small>gespeicherte Erinnerungen</small></div></div><p className="lr-muted">Wichtige Informationen bleiben in deinem geschützten Memory.</p>
              </article>
            </section>
          </section>

          <aside className="lr-right-column">
            <section className="lr-side-card lr-today-card"><div className="lr-panel-head"><div><span className="lr-kicker">ÜBERBLICK</span><h2>Heute</h2></div><span className="lr-today-symbol">✧</span></div><p className="lr-side-date">{today || "Dein Tag"}</p><div className="lr-today-stat"><span>Offene Aufgaben</span><b>{loading ? "…" : counts.tasks.length}</b></div><div className="lr-today-stat"><span>Aktive Projekte</span><b>{loading ? "…" : counts.projects}</b></div><div className="lr-today-stat"><span>Memory-Einträge</span><b>{loading ? "…" : counts.memories}</b></div></section>
            <section className="lr-side-card" id="tools"><div className="lr-panel-head"><div><span className="lr-kicker">DIREKT STARTEN</span><h2>Schnellzugriffe</h2></div></div><div className="lr-shortcuts"><a href="#chat"><span className="lr-shortcut-icon blue">✧</span><span><b>Mit Luna chatten</b><small>Frage stellen oder Idee planen</small></span><strong>↗</strong></a><a href="#tasks"><span className="lr-shortcut-icon violet">☑</span><span><b>Aufgaben ansehen</b><small>Deine nächsten Schritte</small></span><strong>↗</strong></a><a href="#agents"><span className="lr-shortcut-icon cyan">♙</span><span><b>Agent auswählen</b><small>Passenden Spezialisten öffnen</small></span><strong>↗</strong></a><a href="#memory"><span className="lr-shortcut-icon green">✧</span><span><b>Memory öffnen</b><small>Wichtiges wiederfinden</small></span><strong>↗</strong></a></div></section>
            <section className="lr-side-card lr-side-tasks"><div className="lr-panel-head"><div><span className="lr-kicker">ALS NÄCHSTES</span><h2>Aufgaben</h2></div><a className="lr-text-link" href="#tasks">Alle ↗</a></div>{loading ? <p className="lr-muted">Wird geladen …</p> : counts.tasks.length ? <ul className="lr-task-list">{counts.tasks.slice(0, 3).map((task, i) => <li key={String(task.id ?? "side-" + i)}><span className="lr-check">○</span><span>{task.title ?? task.name ?? "Aufgabe"}</span></li>)}</ul> : <div className="lr-empty lr-empty-small"><span>✓</span><p>Keine Aufgaben geladen.</p></div>}</section>
            <div className="lr-right-status"><i /> Deine Daten werden geschützt verarbeitet.</div>
          </aside>
        </div>

        <footer className="lr-footer" id="settings"><span>◐ LUNA · PERSONAL AI</span><span><i /> SYSTEM BEREIT</span></footer>
      </div>
    </main>
  );
}
