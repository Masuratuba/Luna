"use client";

import { useCallback, useEffect, useRef, useState } from "react";
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

  const speak = useCallback((text: string) => {
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
  }, []);

  const sendToLuna = useCallback(async (message: string) => {
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
  }, [agentId, conversationId, onConversationId, onMessage, speak]);

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
  }, [sendToLuna]);

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
        <span className="luna-voice-wave" aria-hidden="true"><i /><i /><i /><i /><i /></span>
        <span>{listening ? "Zuhören stoppen" : speaking ? "LUNA spricht" : "Sprich mit LUNA"}</span>
        <b aria-hidden="true">›</b>
      </button>
      <div className="luna-voice-status" aria-live="polite">{status}</div>
      <style jsx>{`
        .luna-voice { display: flex; flex-direction: column; align-items: center; padding: 0; text-align: center; }
        .luna-voice-button { min-height: 48px; min-width: min(245px, 72vw); display: inline-flex; align-items: center; justify-content: center; gap: 10px; padding: 0 18px; border: 1px solid rgba(108,202,255,.62); border-radius: 999px; color: #eef8ff; background: rgba(3,10,20,.72); backdrop-filter: blur(14px); box-shadow: 0 0 22px rgba(56,177,255,.16), inset 0 0 18px rgba(56,177,255,.05); cursor: pointer; font-size: 13px; font-weight: 650; letter-spacing: .01em; transition: transform .2s ease, box-shadow .2s ease, border-color .2s ease; }
        .luna-voice-button:hover { transform: translateY(-1px); border-color: rgba(154,224,255,.9); box-shadow: 0 0 30px rgba(56,177,255,.24), inset 0 0 18px rgba(56,177,255,.07); }
        .luna-voice-button:disabled { opacity: .72; cursor: default; }
        .luna-voice.listening .luna-voice-button { border-color: rgba(76,216,255,.95); box-shadow: 0 0 0 4px rgba(76,216,255,.07), 0 0 34px rgba(76,216,255,.3), inset 0 0 20px rgba(76,216,255,.08); }
        .luna-voice-wave { width: 28px; height: 24px; display: flex; align-items: center; justify-content: center; gap: 2px; }
        .luna-voice-wave i { width: 2px; height: 8px; border-radius: 4px; background: currentColor; opacity: .78; }
        .luna-voice.listening .luna-voice-wave i:nth-child(1), .luna-voice.listening .luna-voice-wave i:nth-child(5) { height: 7px; }
        .luna-voice.listening .luna-voice-wave i:nth-child(2), .luna-voice.listening .luna-voice-wave i:nth-child(4) { height: 15px; }
        .luna-voice.listening .luna-voice-wave i:nth-child(3) { height: 22px; }
        .luna-voice.speaking .luna-voice-wave i { animation: lunaVoicePulse .75s ease-in-out infinite alternate; }
        .luna-voice.speaking .luna-voice-wave i:nth-child(2), .luna-voice.speaking .luna-voice-wave i:nth-child(4) { animation-delay: .15s; }
        .luna-voice.speaking .luna-voice-wave i:nth-child(3) { animation-delay: .3s; }
        .luna-voice-button b { margin-left: 2px; color: rgba(220,244,255,.72); font-size: 22px; line-height: 1; font-weight: 300; }
        .luna-voice-status { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; }
        @keyframes lunaVoicePulse { from { transform: scaleY(.55); } to { transform: scaleY(1.7); } }
      `}</style>
    </div>
  );
}
