"use client";

import { useState } from "react";

export default function LoginPage() {
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(false);

  async function signIn(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!password || loading) return;
    setLoading(true);
    setStatus("");
    try {
      const response = await fetch("/api/owner-login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const result = await response.json() as { error?: string };
      if (!response.ok) {
        setStatus(result.error || "Anmeldung fehlgeschlagen.");
        return;
      }
      window.location.assign("/");
    } catch {
      setStatus("Verbindung fehlgeschlagen. Bitte erneut versuchen.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="luna-shell">
      <div className="luna-background" aria-hidden="true" />
      <div className="luna-overlay" />
      <section className="luna-content">
        <header className="luna-brand">🌙 LUNA</header>
        <div className="luna-panel">
          <h1>Anmelden</h1>
          <p>Dein persönlicher Zugang zu LUNA.</p>
          <form className="luna-input" onSubmit={signIn}>
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Passwort"
              required
              autoComplete="current-password"
              aria-label="Passwort"
            />
            <button type="submit" disabled={loading}>{loading ? "…" : "→"}</button>
          </form>
          {status && <p role="alert">{status}</p>}
        </div>
      </section>
    </main>
  );
}
