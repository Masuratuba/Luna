import type { LunaContext } from "./types";
import type { MemoryCandidate } from "./memory";

export type EpistemicState = "known" | "inferred" | "unknown";
export type LearningSignalType = "interest" | "preference" | "goal" | "habit" | "project" | "communication_style" | "decision_style";

export type LearningSignal = {
  type: LearningSignalType;
  content: string;
  confidence: number;
  source: "explicit" | "inferred";
};

export type IntelligenceAssessment = {
  message: string;
  epistemic: EpistemicState;
  needsClarification: boolean;
  clarificationReason?: string;
  memoryCandidates: MemoryCandidate[];
  learningSignals: LearningSignal[];
  followUp: {
    relevant: boolean;
    reason?: string;
    suggestedQuestion?: string;
  };
  truthRules: string[];
};

const SECRET_PATTERN = /\b(api[_ -]?key|passwort|password|secret|token|private[_ -]?key)\b/i;
const EXPLICIT_FACT_PATTERNS: Array<{ type: LearningSignalType; pattern: RegExp }> = [
  { type: "preference", pattern: /\b(?:ich\s+)?(?:mag|liebe|bevorzuge|gefällt mir)\b/i },
  { type: "interest", pattern: /\b(?:interessiere mich für|interessant finde|mein interesse ist)\b/i },
  { type: "goal", pattern: /\b(?:ich will|ich möchte|mein ziel ist|ich muss)\b/i },
  { type: "project", pattern: /\b(?:mein projekt|wir bauen|ich arbeite an|ich entwickle)\b/i },
  { type: "habit", pattern: /\b(?:ich mache normalerweise|jeden tag|immer wenn|meistens)\b/i },
];

function cleanContent(message: string): string {
  return message.trim().replace(/\s+/g, " ").slice(0, 1000);
}

function inferEpistemic(message: string): EpistemicState {
  const text = message.toLowerCase();
  if (/\b(ich weiß nicht|keine ahnung|unsicher|vielleicht|vermutlich|glaube ich)\b/.test(text)) return "unknown";
  if (/\b(ich weiß|sicher|definitiv|tatsächlich|bereits geprüft)\b/.test(text)) return "known";
  return "inferred";
}

function buildLearningSignals(message: string): LearningSignal[] {
  if (SECRET_PATTERN.test(message)) return [];
  const content = cleanContent(message);
  return EXPLICIT_FACT_PATTERNS.filter(({ pattern }) => pattern.test(message)).map(({ type }) => ({
    type,
    content,
    confidence: 0.82,
    source: "explicit" as const,
  }));
}

function buildMemoryCandidates(message: string, signals: LearningSignal[]): MemoryCandidate[] {
  if (!signals.length || SECRET_PATTERN.test(message)) return [];
  return signals.map((signal) => ({
    type: signal.type === "project" ? "project" : signal.type === "goal" ? "personal" : signal.type === "preference" ? "preference" : "fact",
    content: signal.content,
    importance: signal.type === "goal" || signal.type === "project" ? 0.9 : 0.7,
  }));
}

function buildFollowUp(message: string, signals: LearningSignal[]): IntelligenceAssessment["followUp"] {
  if (signals.length > 0) return { relevant: false };
  if (/\?\s*$/.test(message) || message.length < 12) return { relevant: false };
  if (/\b(wichtig|ziel|projekt|möchte|will|liebe|mag|bevorzuge)\b/i.test(message)) {
    return {
      relevant: true,
      reason: "The conversation contains a personal or goal-related cue without a durable learning signal.",
      suggestedQuestion: "Was davon ist dir langfristig besonders wichtig?",
    };
  }
  return { relevant: false };
}

export function assessIntelligence(context: LunaContext): IntelligenceAssessment {
  const message = cleanContent(context.message);
  const epistemic = inferEpistemic(message);
  const learningSignals = buildLearningSignals(message);
  const memoryCandidates = buildMemoryCandidates(message, learningSignals);
  const needsClarification = message.length === 0;

  return {
    message,
    epistemic,
    needsClarification,
    clarificationReason: needsClarification ? "No usable message was provided." : undefined,
    memoryCandidates,
    learningSignals,
    followUp: buildFollowUp(message, learningSignals),
    truthRules: [
      "Never present an inference as a verified fact.",
      "Never claim an action happened unless the executor reports success.",
      "Never claim to remember information that was not retrieved from memory or the current conversation.",
      "Never invent a source, result, tool execution, or personal fact.",
      "When uncertain, say so or ask a focused clarification question.",
    ],
  };
}
