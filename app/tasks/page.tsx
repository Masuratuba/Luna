import LunaNav from "../components/LunaNav";
import LunaTasks from "../components/LunaTasks";

export default function TasksPage() {
  return <main className="luna-shell"><div className="luna-background" aria-hidden="true" /><div className="luna-overlay" /><section className="luna-content"><LunaNav /><header className="luna-page-hero"><div className="luna-orb" aria-hidden="true"><div className="luna-orb-glow" /><div className="luna-orb-core" /></div><div className="luna-wordmark">LUNA</div><p className="luna-tagline">Dein Raum für Fokus</p></header><LunaTasks /><footer className="luna-footer"><span>LUNA · Personal AI Assistant</span><span className="footer-status"><i /> Aufgabenbereich</span></footer></section></main>;
}
