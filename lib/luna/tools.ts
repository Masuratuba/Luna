import type { SupabaseClient } from "@supabase/supabase-js";

export const LUNA_TOOLS = [
  {
    type: "function" as const,
    name: "save_memory",
    description: "Save an important user fact, preference, instruction, decision, or project fact for future conversations.",
    parameters: {
      type: "object",
      properties: {
        content: { type: "string" },
        type: { type: "string", enum: ["personal", "preference", "project", "decision", "fact", "instruction"] },
        importance: { type: "integer", minimum: 1, maximum: 5 },
      },
      required: ["content", "type", "importance"],
      additionalProperties: false,
    },
    strict: true,
  },
  {
    type: "function" as const,
    name: "create_project",
    description: "Create a project for the authenticated user.",
    parameters: {
      type: "object",
      properties: { name: { type: "string" }, description: { type: ["string", "null"] } },
      required: ["name", "description"], additionalProperties: false,
    }, strict: true,
  },
  {
    type: "function" as const,
    name: "list_projects",
    description: "List the user's projects.",
    parameters: { type: "object", properties: {}, required: [], additionalProperties: false },
    strict: true,
  },
  {
    type: "function" as const,
    name: "create_task",
    description: "Create a task for the authenticated user, optionally inside a project.",
    parameters: {
      type: "object",
      properties: {
        title: { type: "string" }, description: { type: ["string", "null"] },
        project_id: { type: ["string", "null"] }, priority: { type: "integer", minimum: 1, maximum: 5 },
        due_at: { type: ["string", "null"] },
      },
      required: ["title", "description", "project_id", "priority", "due_at"], additionalProperties: false,
    }, strict: true,
  },
  {
    type: "function" as const,
    name: "list_tasks",
    description: "List the user's tasks.",
    parameters: { type: "object", properties: {}, required: [], additionalProperties: false },
    strict: true,
  },
  {
    type: "function" as const,
    name: "create_automation",
    description: "Create a scheduled automation. schedule must be a valid iCal RRULE or a single future ISO timestamp.",
    parameters: {
      type: "object",
      properties: { title: { type: "string" }, prompt: { type: "string" }, schedule: { type: "string" }, next_run_at: { type: ["string", "null"] } },
      required: ["title", "prompt", "schedule", "next_run_at"], additionalProperties: false,
    }, strict: true,
  },
];

type ToolArgs = Record<string, unknown>;

export async function executeLunaTool(name: string, args: ToolArgs, supabase: SupabaseClient, userId: string) {
  switch (name) {
    case "save_memory": {
      const content = String(args.content ?? "").trim();
      if (!content) return { ok: false, error: "content is required" };
      const { data, error } = await supabase.from("memories").insert({
        user_id: userId, type: String(args.type ?? "fact"), content,
        importance: Math.min(5, Math.max(1, Number(args.importance ?? 3))), metadata: { source: "luna-tool" },
      }).select("id,type,content,importance").single();
      if (error) return { ok: false, error: error.message };
      return { ok: true, memory: data };
    }
    case "create_project": {
      const { data, error } = await supabase.from("projects").insert({ user_id: userId, name: String(args.name ?? "").trim(), description: args.description ?? null, status: "active", metadata: {} }).select("id,name,description,status").single();
      if (error) return { ok: false, error: error.message };
      return { ok: true, project: data };
    }
    case "list_projects": {
      const { data, error } = await supabase.from("projects").select("id,name,description,status,updated_at").eq("user_id", userId).order("updated_at", { ascending: false }).limit(50);
      if (error) return { ok: false, error: error.message };
      return { ok: true, projects: data ?? [] };
    }
    case "create_task": {
      const { data, error } = await supabase.from("tasks").insert({ user_id: userId, project_id: args.project_id ?? null, title: String(args.title ?? "").trim(), description: args.description ?? null, status: "todo", priority: Math.min(5, Math.max(1, Number(args.priority ?? 3))), due_at: args.due_at ?? null }).select("id,title,description,status,priority,due_at,project_id").single();
      if (error) return { ok: false, error: error.message };
      return { ok: true, task: data };
    }
    case "list_tasks": {
      const { data, error } = await supabase.from("tasks").select("id,title,description,status,priority,due_at,project_id").eq("user_id", userId).order("due_at", { ascending: true, nullsFirst: false }).limit(100);
      if (error) return { ok: false, error: error.message };
      return { ok: true, tasks: data ?? [] };
    }
    case "create_automation": {
      const next = args.next_run_at ? new Date(String(args.next_run_at)) : null;
      const { data, error } = await supabase.from("automations").insert({ user_id: userId, title: String(args.title ?? "LUNA Automation").trim(), prompt: String(args.prompt ?? "").trim(), schedule: String(args.schedule ?? "").trim(), enabled: true, next_run_at: next && !Number.isNaN(next.getTime()) ? next.toISOString() : null }).select("id,title,prompt,schedule,enabled,next_run_at").single();
      if (error) return { ok: false, error: error.message };
      return { ok: true, automation: data };
    }
    default:
      return { ok: false, error: `Unknown tool: ${name}` };
  }
}
