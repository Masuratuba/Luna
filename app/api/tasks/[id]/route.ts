import { requireUser } from "../../../../lib/supabase/auth";
import { createTaskItemHandlers } from "../../../../lib/luna/task-handlers";

const handlers = createTaskItemHandlers(requireUser);
export const PATCH = handlers.PATCH;
export const DELETE = handlers.DELETE;
