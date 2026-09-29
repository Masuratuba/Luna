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

export type MemoryCommandFailureReason = "NO_TARGET" | "NO_REPLACEMENT" | "SENSITIVE";

export function buildMemoryCommandFailureResponse(reason: MemoryCommandFailureReason) {
  const reply = reason === "NO_TARGET"
    ? "Sag mir bitte, was ich vergessen oder ändern soll."
    : reason === "NO_REPLACEMENT"
      ? "Sag mir bitte auch, auf welchen neuen Wert ich die Erinnerung ändern soll."
      : "Die neue Information enthält sensible Zugangsdaten.";

  return {
    status: 400,
    body: {
      ok: false as const,
      actionStatus: "failed" as const,
      reply,
    },
  };
}
