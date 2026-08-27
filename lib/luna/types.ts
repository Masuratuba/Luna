export type LunaDecision =
  | "ANSWER"
  | "USE_MEMORY"
  | "USE_TOOL"
  | "CREATE_TASK"
  | "SAVE_MEMORY"
  | "ASK_CLARIFICATION";

export type LunaContext = {
  userId: string;
  message: string;
  conversationId?: string;
};

export type ToolRequest = {
  name: string;
  input: Record<string, unknown>;
};
