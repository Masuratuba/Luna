"use client";

import { useEffect, useRef, useState } from "react";
import type { LunaAgentId } from "../../lib/luna/agents";

type Props = {
  agentId: LunaAgentId;
  conversationId?: string;
  onConversationId: (id: string) => void;
  onMessage: (role: "user" | "assistant", content: string) => void;
};

type RecognitionLike = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onstart: (() => void) | null;
  onend: (() => void) | null;
  onerror: ((event: { error?: string }) => void) | null;
  onresult: ((event: { results: ArrayLike<{ 0: { transcript: string } }> }) => void) | null;
  start: () => void;
  stop: () => void;
};

type WindowWithRecognition = Window & {
  SpeechRecognition?: new () => RecognitionLike;
  webkitSpeechRecognition?: new () => RecognitionLike;
};

export default function LunaVoice({ agentId, conversationId, onConversationId, onMessage }: Props) {
  const recognitionRef = useRef<RecognitionLike | null>(null);
  const [listening, setListening] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [status, setStatus] = useState("Voice bereit");
  const [supported, setSupported] = useState(true);

  useEffect(() => {
    const recognitionCtor = (window as WindowWithRecognition).SpeechRecognition ?? (window as WindowWithRecognition).webkitSpeechRecognition;
    if (!recognitionCtor) {
      setSupported(false);
      setStatus("Voice wird von diesem Browser nicht unterstützt");
      return;
    }

    const recognition = new recognitionCtor();
    recognition.lang = "de-DE";
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.onstart = () => {
      setListening(true);
      setStatus("LUNA hört zu …");
    };
    recognition.onend = () => {
      setListening(false);
      setStatus("Voice bereit");
    };
    recognition.onerror = (event) => {
      setListening(false);
      setStatus(event.error === "not-allowed" ? "Mikrofonzugriff verweigert" : "Voice-Fehler – bitte erneut versuchen");
    };
    recognition.onresult = (event) => {
      const transcript = event.results[0]?.[0]?.transcript?.trim();
      if (transcript) void sendToLuna(transcript);
    };
    recognitionRef.current = recognition;

    return () => {
      recognition.onresult = null;
      recognition.stop();
      recognitionRef.current = null;
    };
  }, [agentId, conversationId]);

  async function sendToLuna(message: string) {
    setStatus("LUNA denkt …");
    onMessage("user", message);
    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message, conversationId, agentId }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "LUNA API-Fehler");
      if (data.conversationId) onConversationId(data.conversationId);
      const reply = typeof data.reply === "string" ? data.reply : "Ich konnte gerade keine Antwort erzeugen.";
      onMessage("assistant", reply);
      speak(reply);
    } catch {
      const reply = "Die Verbindung zu LUNA ist gerade fehlgeschlagen.";
      onMessage("assistant", reply);
      speak(reply);
    }
  }

  function speak(text: string) {
    if (!("speechSynthesis" in window)) {
      setStatus("Antwort erhalten");
      return;
    }
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "de-DE";
    utterance.rate = 0.98;
    utterance.pitch = 1;
    utterance.onstart = () => {
      setSpeaking(true);
      setStatus("LUNA spricht …");
    };
    utterance.onend = () => {
      setSpeaking(false);
      setStatus("Voice bereit");
    };
    utterance.onerror = () => {
      setSpeaking(false);
      setStatus("Voice bereit");
    };
    window.speechSynthesis.speak(utterance);
  }

  function toggleVoice() {
    if (!supported || speaking) return;
    const recognition = recognitionRef.current;
    if (!recognition) return;
    if (listening) {
      recognition.stop();
      return;
    }
    window.speechSynthesis?.cancel();
    try {
      recognition.start();
    } catch {
      setStatus("Voice ist bereits aktiv");
    }
  }

  return (
    <div className={`luna-voice ${listening ? "listening" : ""} ${speaking ? "speaking" : ""}`}>
      <button type="button" className="luna-voice-button" onClick={toggleVoice} disabled={!supported || speaking} aria-label={listening ? "Voice stoppen" : "Mit LUNA sprechen"}>
        <span className="luna-voice-orb" aria-hidden="true"><i /><i /><i /><i /><i /></span>
        <span>{listening ? "Zuhören stoppen" : speaking ? "LUNA spricht" : "Mit LUNA sprechen"}</span>
      </button>
      <div className="luna-voice-status" aria-live="polite">{status}</div>
    </div>
  );
}
