export default function Home() {
  return (
    <main className="luna-shell">
      <div className="luna-background" aria-hidden="true" />
      <div className="luna-overlay" />
      <section className="luna-content">
        <div className="luna-brand">🌙 LUNA</div>
        <p className="luna-status"><span /> Bereit</p>
        <div className="luna-panel">
          <h1>Deine persönliche KI-Assistentin</h1>
          <p>Chat · Memory · Organisation</p>
          <button type="button">Mit Luna starten</button>
        </div>
      </section>
    </main>
  );
}
