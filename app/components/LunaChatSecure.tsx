"use client";

import { useState } from "react";
import { getLunaAgent, type LunaAgentId } from "../../lib/luna/agents";

type Message = { role: "user" | "assistant"; content: string };

type Props = {
  initialAgentId: LunaAgentId;
};

export default function LunaChatSecure({ initialAgentId }: Props) {
  const [agentId] = useState<LunaAgentId>(initialAgentId);
  const agent = getLunaAgent(agentId) ?? getLunaAgent("luna")!;
  const [messages, setMessages] = useState<Message[]>([
    { role: "assistant", content: `Hallo. Ich bin ${agent.name}. Woran arbeiten wir heute?` },
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
        body: JSON.stringify({ message, conversationId, agentId }),
      });
      const data = await response.json();
      if (data.conversationId) setConversationId(data.conversationId);

      const answer = data.reply ?? [data.error, data.detail].filter(Boolean).join(" — ") ?? "Keine Antwort erhalten.";
      setMessages((current) => [...current, { role: "assistant", content: answer }]);
    } catch {
      setMessages((current) => [...current, { role: "assistant", content: `Verbindung zu ${agent.name} fehlgeschlagen.` }]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="luna-chat">
      <div className="luna-chat-header">
        <div><strong>🌙 {agent.name}</strong><span><i /> Bereit</span></div>
        <small>LUNA 0.2</small>
      </div>
      <div className="luna-messages" aria-live="polite">
        {messages.map((message, index) => (
          <div className={`luna-message ${message.role}`} key={`${message.role}-${index}`}>{message.content}</div>
        ))}
        {loading && <div className="luna-message assistant">{agent.name} denkt …</div>}
      </div>
      <form className="luna-input" onSubmit={sendMessage}>
        <input value={input} onChange={(event) => setInput(event.target.value)} placeholder={`Mit ${agent.name} sprechen …`} aria-label={`Nachricht an ${agent.name}`} autoComplete="off" />
        <button type="submit" disabled={loading || !input.trim()} aria-label="Senden">↑</button>
      </form>
    </div>
  );
}
