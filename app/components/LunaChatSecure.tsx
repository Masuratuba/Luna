"use client";

import { useState } from "react";

type Message = { role: "user" | "assistant"; content: string };

export default function LunaChatSecure() {
  const [messages, setMessages] = useState<Message[]>([
    { role: "assistant", content: "Hallo. Ich bin LUNA. Woran arbeiten wir heute?" },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [conversationId, setConversationId] = useState<string>();

  async function sendMessage(event: React.FormEvent) {
    event.preventDefault();
    const message = input.trim();
    if (!message || loading) return;

    setInput("");
    setMessages((current) => [...current, { role: "user", content: message }]);
    setLoading(true);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message, conversationId }),
      });
      const data = await response.json();
      if (data.conversationId) setConversationId(data.conversationId);
      setMessages((current) => [
        ...current,
        { role: "assistant", content: data.reply ?? data.error ?? "Keine Antwort erhalten." },
      ]);
    } catch {
      setMessages((current) => [...current, { role: "assistant", content: "Verbindung zu LUNA fehlgeschlagen." }]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="luna-chat">
      <div className="luna-chat-header">
        <div><strong>🌙 LUNA</strong><span><i /> Bereit</span></div>
        <small>LUNA 0.1</small>
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
