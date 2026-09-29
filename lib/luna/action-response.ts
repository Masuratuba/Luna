import type { LunaDecision } from "./types";

export type ActionFailureResponse = {
  status: number;
  body: {
    ok: false;
    conversationId: string;
    decision: LunaDecision;
    agent: string;
    actionId: string;
    actionStatus: "failed";
    reply: string;
  };
};

/** Build a deterministic API response for a failed action; never describe it as completed. */
export function buildActionFailureResponse(input: {
  decision: Extract<LunaDecision, "USE_TOOL" | "CREATE_TASK" | "SAVE_MEMORY">;
  agent: string;
  actionId: string;
  conversationId: string;
  requiresApproval: boolean;
}): ActionFailureResponse {
  const reply = input.requiresApproval
    ? "Diese Aktion braucht zuerst deine ausdrückliche Freigabe."
    : input.decision === "USE_TOOL"
      ? "Ich konnte die Recherche gerade nicht verlässlich ausführen."
      : input.decision === "CREATE_TASK"
        ? "Ich konnte die Aufgabe nicht ausführen."
        : "Ich konnte die Erinnerung nicht sicher speichern.";

  return {
    status: input.requiresApproval ? 403 : 502,
    body: {
      ok: false,
      conversationId: input.conversationId,
      decision: input.decision,
      agent: input.agent,
      actionId: input.actionId,
      actionStatus: "failed",
      reply,
    },
  };
}
