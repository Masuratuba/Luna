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
      <style jsx>{`
        .luna-voice { padding: 14px 18px 12px; border-top: 1px solid rgba(255,255,255,.07); text-align: center; background: rgba(0,0,0,.08); }
        .luna-voice-button { min-height: 52px; min-width: min(260px, 82vw); display: inline-flex; align-items: center; justify-content: center; gap: 11px; border: 1px solid rgba(112,220,151,.34); border-radius: 999px; color: #fff; background: linear-gradient(180deg, rgba(38,177,91,.95), rgba(26,139,69,.95)); box-shadow: 0 9px 28px rgba(32,168,84,.2); cursor: pointer; font-weight: 700; }
        .luna-voice-button:disabled { opacity: .65; cursor: default; }
        .luna-voice.listening .luna-voice-button { border-color: rgba(255,255,255,.35); box-shadow: 0 0 0 5px rgba(70,211,105,.08), 0 12px 36px rgba(32,168,84,.28); }
        .luna-voice-orb { width: 27px; height: 27px; display: flex; align-items: center; justify-content: center; gap: 2px; }
        .luna-voice-orb i { width: 3px; height: 10px; border-radius: 4px; background: currentColor; opacity: .75; }
        .luna-voice.listening .luna-voice-orb i:nth-child(1), .luna-voice.listening .luna-voice-orb i:nth-child(5) { height: 8px; }
        .luna-voice.listening .luna-voice-orb i:nth-child(2), .luna-voice.listening .luna-voice-orb i:nth-child(4) { height: 17px; }
        .luna-voice.listening .luna-voice-orb i:nth-child(3) { height: 23px; }
        .luna-voice-status { min-height: 17px; margin-top: 7px; color: rgba(255,255,255,.48); font-size: 11px; letter-spacing: .03em; }
      `}</style>
    </div>
  );
}
