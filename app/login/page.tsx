"use client";

import { useState } from "react";
import { createSupabaseBrowserClient } from "../../lib/supabase/browser";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(false);

  async function sendMagicLink(event: React.FormEvent) {
    event.preventDefault();
    if (!email.trim() || loading) return;
    setLoading(true);
    setStatus("");

    const supabase = createSupabaseBrowserClient();
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: { emailRedirectTo: `${window.location.origin}/auth/callback?next=/` },
    });

    setStatus(error ? error.message : "Login-Link wurde an deine E-Mail gesendet.");
    setLoading(false);
  }

  return (
    <main className="luna-shell">
      <div className="luna-background" aria-hidden="true" />
      <div className="luna-overlay" />
      <section className="luna-content">
        <header className="luna-brand">🌙 LUNA</header>
        <div className="luna-panel">
          <h1>Anmelden</h1>
          <p>Deine LUNA-Daten bleiben deinem Konto zugeordnet.</p>
          <form className="luna-input" onSubmit={sendMagicLink}>
            <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="E-Mail-Adresse" required autoComplete="email" />
            <button type="submit" disabled={loading}>{loading ? "…" : "→"}</button>
          </form>
          {status && <p role="status">{status}</p>}
        </div>
      </section>
    </main>
  );
}
