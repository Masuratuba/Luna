import { requireUser } from "../../../lib/supabase/auth";
import { createTaskCollectionHandlers } from "../../../lib/luna/task-handlers";

const handlers = createTaskCollectionHandlers(requireUser);
export const GET = handlers.GET;
export const POST = handlers.POST;
