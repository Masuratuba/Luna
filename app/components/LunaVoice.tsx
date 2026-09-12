"use client";

import { useEffect, useRef, useState } from "react";
import type { LunaAgentId } from "../../lib/luna/agents";

type Props = {
  agentId: LunaAgentId;
  conversationId?: string;
  onConversationId: (id: string) => void;
  onMessage: (role: "user" | "assistant", content: string) => void;
};

function getRecorderOptions() {
  if (typeof MediaRecorder === "undefined") return undefined;
  const candidates = ["audio/mp4", "audio/webm;codecs=opus", "audio/webm"];
  const mimeType = candidates.find((type) => MediaRecorder.isTypeSupported(type));
  return mimeType ? { mimeType } : undefined;
}

export default function LunaVoice({ agentId, conversationId, onConversationId, onMessage }: Props) {
  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [recording, setRecording] = useState(false);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("Bereit");
  const [unsupported, setUnsupported] = useState(false);

  useEffect(() => {
    setUnsupported(typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined");
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      streamRef.current?.getTracks().forEach((track) => track.stop());
    };
  }, []);

  async function speak(text: string) {
    const response = await fetch("/api/voice/speak", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
    });
    if (!response.ok) throw new Error("TTS failed");
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const audio = new Audio(url);
    audio.onended = () => URL.revokeObjectURL(url);
    await audio.play();
  }

  async function processRecording(blob: Blob) {
    setBusy(true);
    setStatus("LUNA hört zu …");
    try {
      const extension = blob.type.includes("mp4") ? "m4a" : "webm";
      const form = new FormData();
      form.append("audio", new File([blob], `luna-voice.${extension}`, { type: blob.type || "audio/mp4" }));

      const transcriptionResponse = await fetch("/api/voice/transcribe", { method: "POST", body: form });
      const transcription = await transcriptionResponse.json();
      if (!transcriptionResponse.ok || typeof transcription.text !== "string") {
        throw new Error(transcription.error || "Transkription fehlgeschlagen");
      }

      const message = transcription.text.trim();
      if (!message) {
        setStatus("Ich habe nichts verstanden");
        return;
      }

      onMessage("user", message);
      setStatus("LUNA denkt …");
      const chatResponse = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message, conversationId, agentId }),
      });
      const data = await chatResponse.json();
      if (!chatResponse.ok) throw new Error(data.error || "LUNA API-Fehler");
      if (data.conversationId) onConversationId(data.conversationId);

      const reply = typeof data.reply === "string" ? data.reply : "Ich konnte gerade keine Antwort erzeugen.";
      onMessage("assistant", reply);
      setStatus("LUNA antwortet …");
      await speak(reply);
      setStatus("Bereit");
    } catch (error) {
      console.error("Luna voice error", error);
      const message = error instanceof Error && error.message ? error.message : "Voice konnte nicht ausgeführt werden.";
      onMessage("assistant", `Voice-Fehler: ${message}`);
      setStatus("Fehler – erneut versuchen");
    } finally {
      setBusy(false);
    }
  }

  async function startRecording() {
    if (busy || recording || unsupported) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      chunksRef.current = [];
      const recorder = new MediaRecorder(stream, getRecorderOptions());
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunksRef.current.push(event.data);
      };
      recorder.onstop = () => {
        stream.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType || "audio/mp4" });
        chunksRef.current = [];
        void processRecording(blob);
      };
      recorder.onerror = () => {
        setRecording(false);
        setStatus("Mikrofonfehler – erneut versuchen");
      };
      recorderRef.current = recorder;
      recorder.start();
      setRecording(true);
      setStatus("Ich höre zu …");
      timeoutRef.current = setTimeout(stopRecording, 30_000);
    } catch (error) {
      console.error("Luna microphone error", error);
      setStatus("Mikrofonzugriff nicht möglich");
    }
  }

  function stopRecording() {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = null;
    const recorder = recorderRef.current;
    if (!recorder || recorder.state === "inactive") return;
    recorderRef.current = null;
    setRecording(false);
    recorder.stop();
  }

  function toggleVoice() {
    if (recording) stopRecording();
    else void startRecording();
  }

  return (
    <div className={`luna-voice ${recording ? "recording" : ""} ${busy ? "busy" : ""}`}>
      <button type="button" className="luna-voice-button" onClick={toggleVoice} disabled={busy || unsupported} aria-label={recording ? "Aufnahme stoppen" : "Mit LUNA sprechen"}>
        <span className="luna-voice-wave" aria-hidden="true"><i /><i /><i /><i /><i /></span>
        <span>{unsupported ? "Voice nicht verfügbar" : recording ? "Ich höre zu …" : busy ? "LUNA arbeitet …" : "Sprich mit LUNA"}</span>
        <b aria-hidden="true">{recording ? "■" : "›"}</b>
      </button>
      <div className="luna-voice-status" aria-live="polite">{status}</div>
      <style jsx>{`
        .luna-voice { display: flex; flex-direction: column; align-items: center; padding: 0; text-align: center; }
        .luna-voice-button { min-height: 50px; min-width: min(280px, 78vw); display: inline-flex; align-items: center; justify-content: center; gap: 10px; padding: 0 20px; border: 1px solid rgba(108,202,255,.68); border-radius: 999px; color: #eef8ff; background: rgba(3,10,20,.78); backdrop-filter: blur(14px); box-shadow: 0 0 24px rgba(56,177,255,.18), inset 0 0 18px rgba(56,177,255,.05); cursor: pointer; font-size: 13px; font-weight: 650; letter-spacing: .01em; transition: transform .2s ease, box-shadow .2s ease, border-color .2s ease; }
        .luna-voice-button:active { transform: scale(.985); }
        .luna-voice-button:disabled { opacity: .58; cursor: default; }
        .luna-voice.recording .luna-voice-button { border-color: rgba(76,216,255,.98); box-shadow: 0 0 0 5px rgba(76,216,255,.07), 0 0 38px rgba(76,216,255,.34), inset 0 0 20px rgba(76,216,255,.1); }
        .luna-voice-wave { width: 28px; height: 24px; display: flex; align-items: center; justify-content: center; gap: 2px; }
        .luna-voice-wave i { width: 2px; height: 8px; border-radius: 4px; background: currentColor; opacity: .82; }
        .luna-voice.recording .luna-voice-wave i { animation: lunaVoicePulse .65s ease-in-out infinite alternate; }
        .luna-voice.recording .luna-voice-wave i:nth-child(2), .luna-voice.recording .luna-voice-wave i:nth-child(4) { animation-delay: .14s; }
        .luna-voice.recording .luna-voice-wave i:nth-child(3) { animation-delay: .28s; }
        .luna-voice-button b { margin-left: 2px; color: rgba(220,244,255,.72); font-size: 16px; line-height: 1; font-weight: 500; }
        .luna-voice-status { margin-top: 8px; min-height: 14px; color: rgba(224,239,255,.68); font-size: 10px; letter-spacing: .08em; }
        @keyframes lunaVoicePulse { from { transform: scaleY(.45); } to { transform: scaleY(1.65); } }
      `}</style>
    </div>
  );
}
