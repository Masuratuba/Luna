export type ProjectStatus = "active" | "paused" | "completed" | "archived";

export type LunaProject = {
  id: string;
  userId: string;
  name: string;
  description?: string | null;
  status: ProjectStatus;
  metadata: Record<string, unknown>;
};
