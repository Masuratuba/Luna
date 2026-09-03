import type { IntelligenceAssessment, LearningSignal } from "./intelligence-core";

export type FollowUpStatus = "open" | "snoozed" | "resolved" | "dismissed";
export type FollowUpPriority = "low" | "normal" | "high";

export type FollowUpItem = {
  id: string;
  userId: string;
  conversationId?: string;
  topic: string;
  source: LearningSignal["type"] | "manual";
  priority: FollowUpPriority;
  status: FollowUpStatus;
  createdAt: string;
  lastMentionedAt: string;
  nextEligibleAt?: string;
  attempts: number;
  userBoundary?: "do_not_follow_up";
};

export type FollowUpPolicy = {
  cooldownHours: number;
  maxOpenItems: number;
  allowUserInitiatedOnly: boolean;
};

export const DEFAULT_FOLLOW_UP_POLICY: FollowUpPolicy = {
  cooldownHours: 24,
  maxOpenItems: 20,
  allowUserInitiatedOnly: true,
};

function priorityFor(signal: LearningSignal): FollowUpPriority {
  if (signal.type === "goal" || signal.type === "project") return "high";
  if (signal.type === "preference" || signal.type === "habit") return "normal";
  return "low";
}

function addHours(iso: string, hours: number): string {
  return new Date(new Date(iso).getTime() + hours * 60 * 60 * 1000).toISOString();
}

export function buildFollowUpItems(
  userId: string,
  assessment: IntelligenceAssessment,
  now = new Date().toISOString(),
): FollowUpItem[] {
  return assessment.learningSignals
    .filter((signal) => signal.type === "goal" || signal.type === "project" || signal.type === "habit")
    .map((signal, index) => ({
      id: `fu-${now.replace(/\D/g, "").slice(0, 14)}-${index}`,
      userId,
      conversationId: undefined,
      topic: signal.content,
      source: signal.type,
      priority: priorityFor(signal),
      status: "open",
      createdAt: now,
      lastMentionedAt: now,
      nextEligibleAt: addHours(now, DEFAULT_FOLLOW_UP_POLICY.cooldownHours),
      attempts: 0,
    }));
}

export function mergeFollowUpItems(
  existing: FollowUpItem[],
  incoming: FollowUpItem[],
  policy: FollowUpPolicy = DEFAULT_FOLLOW_UP_POLICY,
): FollowUpItem[] {
  const merged = [...existing];

  for (const item of incoming) {
    const duplicate = merged.find(
      (candidate) => candidate.userId === item.userId && candidate.status === "open" && candidate.topic.toLowerCase() === item.topic.toLowerCase(),
    );
    if (duplicate) {
      duplicate.lastMentionedAt = item.lastMentionedAt;
      duplicate.priority = duplicate.priority === "high" || item.priority !== "high" ? duplicate.priority : item.priority;
      duplicate.nextEligibleAt = item.nextEligibleAt;
      continue;
    }
    merged.push(item);
  }

  return merged
    .filter((item) => item.status !== "open" || !item.userBoundary)
    .slice(-policy.maxOpenItems);
}

export function selectFollowUp(
  items: FollowUpItem[],
  now = new Date().toISOString(),
): FollowUpItem | null {
  const eligible = items
    .filter((item) => item.status === "open")
    .filter((item) => !item.userBoundary)
    .filter((item) => !item.nextEligibleAt || item.nextEligibleAt <= now)
    .sort((a, b) => {
      const rank = { high: 3, normal: 2, low: 1 };
      return rank[b.priority] - rank[a.priority] || new Date(b.lastMentionedAt).getTime() - new Date(a.lastMentionedAt).getTime();
    });

  return eligible[0] ?? null;
}

export function markFollowUpResolved(item: FollowUpItem): FollowUpItem {
  return { ...item, status: "resolved" };
}

export function markFollowUpDismissed(item: FollowUpItem): FollowUpItem {
  return { ...item, status: "dismissed", userBoundary: "do_not_follow_up" };
}

export function snoozeFollowUp(item: FollowUpItem, hours: number, now = new Date().toISOString()): FollowUpItem {
  return { ...item, status: "snoozed", nextEligibleAt: addHours(now, Math.max(1, hours)) };
}

export function reopenFollowUp(item: FollowUpItem, now = new Date().toISOString()): FollowUpItem {
  return { ...item, status: "open", nextEligibleAt: now, userBoundary: undefined };
}

export function relationshipTruthRules(): string[] {
  return [
    "A follow-up item is a candidate for future attention, not proof that Luna should contact the user autonomously.",
    "Never claim that a follow-up was scheduled, sent, or completed unless a real scheduler or executor reports success.",
    "Respect dismissed or do-not-follow-up boundaries until the user explicitly reopens the topic.",
    "Prefer one relevant follow-up over repeated questions about the same topic.",
    "Keep follow-up state separate from durable memory; persistence requires an explicit storage layer.",
  ];
}
