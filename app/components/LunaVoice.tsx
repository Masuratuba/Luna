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
  const audioContextRef = useRef<AudioContext | null>(null);
  const [recording, setRecording] = useState(false);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("Bereit");
  const [unsupported, setUnsupported] = useState(false);

  useEffect(() => {
    setUnsupported(typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined");
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      streamRef.current?.getTracks().forEach((track) => track.stop());
      void audioContextRef.current?.close();
    };
  }, []);

  async function unlockAudio() {
    if (typeof window === "undefined") return;
    const AudioContextClass = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return;
    if (!audioContextRef.current) audioContextRef.current = new AudioContextClass();
    if (audioContextRef.current.state === "suspended") await audioContextRef.current.resume();
  }

  async function speak(text: string) {
    const response = await fetch("/api/voice/speak", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
    });
    if (!response.ok) throw new Error("TTS failed");

    const audioBuffer = await response.arrayBuffer();
    await unlockAudio();
    const context = audioContextRef.current;
    if (!context) throw new Error("Audio playback unavailable");
    const decoded = await context.decodeAudioData(audioBuffer.slice(0));
    await new Promise<void>((resolve) => {
      const source = context.createBufferSource();
      source.buffer = decoded;
      source.connect(context.destination);
      source.onended = () => resolve();
      source.start(0);
    });
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
        setStatus("Nichts verstanden");
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
      setStatus("Fehler");
    } finally {
      setBusy(false);
    }
  }

  async function startRecording() {
    if (busy || recording || unsupported) return;
    try {
      await unlockAudio();
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
        setStatus("Mikrofonfehler");
      };
      recorderRef.current = recorder;
      recorder.start();
      setRecording(true);
      setStatus("Ich höre zu …");
      timeoutRef.current = setTimeout(stopRecording, 30_000);
    } catch (error) {
      console.error("Luna microphone error", error);
      setStatus("Mikrofon nicht verfügbar");
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
      <style jsx>{`
        .luna-voice { display: flex; flex-direction: column; align-items: center; padding: 0; text-align: center; }
        .luna-voice-button { min-height: 82px; min-width: 82px; width: 82px; display: inline-flex; flex-direction: column; align-items: center; justify-content: center; gap: 5px; padding: 0; border: 2px solid rgba(84,255,155,.9); border-radius: 50%; color: #f7fff9; background: radial-gradient(circle, rgba(10,50,30,.9), rgba(2,10,12,.9)); box-shadow: 0 0 20px rgba(84,255,155,.55), 0 0 55px rgba(84,255,155,.25), inset 0 0 25px rgba(84,255,155,.08); cursor: pointer; font-size: 9px; font-weight: 600; letter-spacing: .02em; transition: transform .2s ease, box-shadow .2s ease, border-color .2s ease; }
        .luna-voice-button:active { transform: scale(.92); }
        .luna-voice-button:disabled { opacity: .65; cursor: default; }
        .luna-voice.recording .luna-voice-button { border-color: #ff4d67; background: radial-gradient(circle, rgba(75,10,20,.92), rgba(12,2,8,.9)); box-shadow: 0 0 22px rgba(255,77,103,.6), 0 0 55px rgba(255,77,103,.28); }
        .luna-voice-wave { width: 28px; height: 22px; display: flex; align-items: center; justify-content: center; gap: 3px; }
        .luna-voice-wave i { width: 2px; height: 8px; border-radius: 4px; background: currentColor; opacity: .88; }
        .luna-voice.recording .luna-voice-wave i { animation: lunaVoicePulse .65s ease-in-out infinite alternate; }
        .luna-voice.recording .luna-voice-wave i:nth-child(2), .luna-voice.recording .luna-voice-wave i:nth-child(4) { animation-delay: .14s; }
        .luna-voice.recording .luna-voice-wave i:nth-child(3) { animation-delay: .28s; }
        .luna-voice-button b { color: rgba(220,244,255,.78); font-size: 14px; line-height: 1; font-weight: 500; }
        @keyframes lunaVoicePulse { from { transform: scaleY(.45); } to { transform: scaleY(1.65); } }
      `}</style>
    </div>
  );
}
