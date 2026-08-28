"use client";

import { useState } from "react";
import Link from "next/link";
import { createSupabaseBrowserClient } from "../../lib/supabase/browser";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(false);

  async function sendMagicLink(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const address = email.trim();
    if (!address || loading) return;

    setLoading(true);
    setStatus("");

    try {
      const supabase = createSupabaseBrowserClient();
      const { error } = await supabase.auth.signInWithOtp({
        email: address,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback?next=/`,
        },
      });

      setStatus(
        error
          ? error.message
          : "Login-Link gesendet. Prüfe jetzt deine E-Mails.",
      );
    } catch {
      setStatus(
        "LUNA kann Supabase noch nicht erreichen. Bitte prüfe die Vercel/Supabase-Konfiguration.",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="luna-shell luna-login-shell">
      <div className="luna-background" aria-hidden="true" />
      <div className="luna-overlay" />

      <section className="luna-content luna-login-content">
        <header className="luna-brand">🌙 LUNA</header>
        <p className="luna-status">
          <span /> Sicher anmelden
        </p>

        <div className="luna-login-card">
          <div className="luna-login-icon" aria-hidden="true">🌙</div>
          <h1>Willkommen zurück</h1>
          <p className="luna-login-description">
            Melde dich an, damit LUNA deine Gespräche und persönlichen Daten
            deinem Konto zuordnen kann.
          </p>

          <form className="luna-login-form" onSubmit={sendMagicLink}>
            <label htmlFor="luna-email">E-Mail-Adresse</label>
            <input
              id="luna-email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="deine@email.de"
              required
              autoComplete="email"
              inputMode="email"
            />
            <button type="submit" disabled={loading}>
              {loading ? "Wird gesendet …" : "Login-Link senden →"}
            </button>
          </form>

          {status && (
            <p className="luna-login-status" role="status" aria-live="polite">
              {status}
            </p>
          )}

          <p className="luna-login-note">
            Kein Passwort nötig. LUNA schickt dir einen sicheren Login-Link.
          </p>

          <Link className="luna-login-back" href="/">
            ← Zurück zu LUNA
          </Link>
        </div>
      </section>
    </main>
  );
}
