import Link from "next/link";
import LunaChatSecure from "./components/LunaChatSecure";

export default function Home() {
  return (
    <main className="luna-shell">
      <div className="luna-background" aria-hidden="true" />
      <div className="luna-overlay" />
      <section className="luna-content">
        <header className="luna-topbar">
          <div className="luna-brand">🌙 LUNA</div>
          <Link className="luna-login-button" href="/login" aria-label="Bei LUNA anmelden" title="Anmelden">
            <span aria-hidden="true">◯</span>
          </Link>
        </header>
        <p className="luna-status"><span /> Bereit</p>
        <LunaChatSecure />
      </section>
    </main>
  );
}
