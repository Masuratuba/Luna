import LunaNav from "../components/LunaNav";

const tools = [
  { icon: "⌕", title: "Recherche", description: "Informationen suchen, prüfen und vergleichen." },
  { icon: "◫", title: "Planung", description: "Ziele in konkrete Schritte und Abläufe zerlegen." },
  { icon: "▤", title: "Dokumente", description: "Dokumente und Dateien bearbeiten, sobald eine Quelle verbunden ist." },
  { icon: "◈", title: "Guardian", description: "Berechtigungen und Freigaben für Aktionen beachten." },
];

export default function ToolsPage() {
  return <main className="luna-shell"><div className="luna-background" aria-hidden="true" /><div className="luna-overlay" /><section className="luna-content"><LunaNav /><header className="luna-page-hero"><div className="luna-orb" aria-hidden="true"><div className="luna-orb-glow" /><div className="luna-orb-core" /></div><div className="luna-wordmark">LUNA</div><p className="luna-tagline">Deine Werkzeuge</p></header><section className="luna-page-panel"><div className="luna-page-heading"><div><span className="eyebrow">CAPABILITIES</span><h1>Tools</h1><p>Funktionen und Integrationen im Überblick.</p></div></div><div className="luna-tool-grid">{tools.map((tool) => <article className="luna-tool-card" key={tool.title}><span>{tool.icon}</span><div><strong>{tool.title}</strong><p>{tool.description}</p></div></article>)}</div><a className="luna-secondary-link" href="/tasks">Aufgaben öffnen →</a></section><footer className="luna-footer"><span>LUNA · Personal AI Assistant</span><span className="footer-status"><i /> Tools</span></footer></section></main>;
}
