export default function Home() {
  return (
    <main style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: 24 }}>
      <section style={{ width: "min(760px, 100%)" }}>
        <h1>🌙 LUNA</h1>
        <p>Personal AI Assistant · LUNA 0.1</p>
        <div style={{ marginTop: 32, padding: 24, border: "1px solid #252a35", borderRadius: 16 }}>
          <strong>Foundation ready.</strong>
          <p style={{ opacity: 0.75 }}>Chat, Memory, Projects and Tasks will be connected to the Luna Core next.</p>
        </div>
      </section>
    </main>
  );
}
