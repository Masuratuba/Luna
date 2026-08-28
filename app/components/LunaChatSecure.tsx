"use client";

import { useEffect, useState } from "react";
import { createSupabaseBrowserClient } from "../../lib/supabase/browser";

type Message = { role: "user" | "assistant"; content: string };

export default function LunaChatSecure() {
  const [messages, setMessages] = useState<Message[]>([
    { role: "assistant", content: "Hallo. Ich bin LUNA. Woran arbeiten wir heute?" },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [conversationId, setConversationId] = useState<string>();
  const [signedIn, setSignedIn] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function restoreConversation() {
      try {
        const supabase = createSupabaseBrowserClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user || cancelled) return;
        setSignedIn(true);

        const conversationsResponse = await fetch("/api/conversations");
        if (!conversationsResponse.ok) return;
        const conversationsData = await conversationsResponse.json();
        const latest = conversationsData.conversations?.[0];
        if (!latest || cancelled) return;

        const messagesResponse = await fetch(`/api/conversations/${latest.id}`);
        if (!messagesResponse.ok) return;
        const messagesData = await messagesResponse.json();
        const restored = Array.isArray(messagesData.messages)
          ? messagesData.messages
              .filter((item: Message) => (item.role === "user" || item.role === "assistant") && typeof item.content === "string")
              .slice(-100)
          : [];
        if (restored.length && !cancelled) {
          setConversationId(latest.id);
          setMessages(restored);
        }
      } catch {
        // Guest mode continues to work exactly as before.
      }
    }
    restoreConversation();
    return () => { cancelled = true; };
  }, []);

  async function sendMessage(event: React.FormEvent) {
    event.preventDefault();
    const message = input.trim();
    if (!message || loading) return;

    const history = messages.slice(-100);
    setInput("");
    setMessages((current) => [...current, { role: "user", content: message }]);
    setLoading(true);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message, conversationId, history }),
      });
      const data = await response.json();
      if (data.conversationId) setConversationId(data.conversationId);

      const fallback = [data.error, data.detail].filter(Boolean).join(" — ") || "Keine Antwort erhalten.";
      const answer = data.reply ?? fallback;
      setMessages((current) => [...current, { role: "assistant", content: answer }]);
    } catch {
      setMessages((current) => [...current, { role: "assistant", content: "Verbindung zu LUNA fehlgeschlagen." }]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="luna-chat">
      <div className="luna-chat-header">
        <div><strong>🌙 LUNA</strong><span><i /> {signedIn ? "Gespeichert" : "Bereit"}</span></div>
        <small>LUNA 0.3</small>
      </div>
      <div className="luna-messages" aria-live="polite">
        {messages.map((message, index) => (
          <div className={`luna-message ${message.role}`} key={`${message.role}-${index}`}>{message.content}</div>
        ))}
        {loading && <div className="luna-message assistant">LUNA denkt …</div>}
      </div>
      <form className="luna-input" onSubmit={sendMessage}>
        <input value={input} onChange={(event) => setInput(event.target.value)} placeholder="Mit Luna sprechen …" aria-label="Nachricht an Luna" autoComplete="off" />
        <button type="submit" disabled={loading || !input.trim()} aria-label="Senden">↑</button>
      </form>
    </div>
  );
}
