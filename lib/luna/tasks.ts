export type TaskStatus = "todo" | "in_progress" | "completed" | "cancelled";

export type LunaTask = {
  id: string;
  userId: string;
  projectId?: string | null;
  title: string;
  description?: string | null;
  status: TaskStatus;
  priority: number;
  dueAt?: string | null;
};
