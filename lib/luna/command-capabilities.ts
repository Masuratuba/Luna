import { containsSensitiveMemory, normalizeMemory, selectRelevantMemories, type MemoryType } from "./memory";

export type LunaCommand =
  | { kind: "forget"; query: string }
  | { kind: "update"; query: string; replacement: string }
  | { kind: "context" }
  | { kind: "verify"; target: string }
  | { kind: "next" }
  | { kind: "continue" }
  | { kind: "think" };

const MEMORY_TYPES = new Set<MemoryType>(["personal", "preference", "project", "decision", "fact", "instruction"]);

export function parseLunaCommand(message: string): LunaCommand | null {
  const text = message.trim();
  const lower = text.toLocaleLowerCase("de-DE");
  if (/^luna[, ]+vergiss\s+/i.test(text)) return { kind: "forget", query: text.replace(/^luna[, ]+vergiss\s+/i, "").trim() };
  const update = text.match(/^luna[, ]+aktualisiere\s+(.+?)\s+(?:zu|auf|mit)\s+(.+)$/i);
  if (update) return { kind: "update", query: update[1].trim(), replacement: update[2].trim() };
  if (/^luna[, ]+kontext\s*$/i.test(text) || lower === "kontext") return { kind: "context" };
  if (/^luna[, ]+prüf(?:e)?\s+(?:das|dies|dass?)?/i.test(text)) return { kind: "verify", target: text.replace(/^luna[, ]+prüf(?:e)?\s+/i, "").trim() || "aktuellen Zustand" };
  if (/^luna[, ]+was jetzt\??$/i.test(text)) return { kind: "next" };
  if (/^luna[, ]+mach weiter\s*$/i.test(text)) return { kind: "continue" };
  if (/^luna[, ]+denk(?:e)? selbst\s*$/i.test(text)) return { kind: "think" };
  return null;
}

function asObject(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

export async function executeLunaCommand(command: LunaCommand, supabase: any, userId: string) {
  if (command.kind === "forget") {
    const query = command.query.slice(0, 500);
    if (!query) return { ok: false, status: 400, reply: "Sag mir bitte, was ich vergessen soll." };
    const { data, error } = await supabase.from("memories").select("id, type, content").eq("user_id", userId).ilike("content", `%${query}%`).limit(20);
    if (error) throw error;
    if (!data?.length) return { ok: true, reply: "Ich habe keine passende Erinnerung gefunden." };
    const ids = data.map((item: { id: string }) => item.id);
    const { error: deleteError } = await supabase.from("memories").delete().eq("user_id", userId).in("id", ids);
    if (deleteError) throw deleteError;
    return { ok: true, reply: `Erledigt. Ich habe ${ids.length} passende Erinnerung${ids.length === 1 ? "" : "en"} gelöscht.`, result: { deleted: data } };
  }

  if (command.kind === "update") {
    if (!command.replacement || containsSensitiveMemory(command.replacement)) return { ok: false, status: 400, reply: "Die neue Information ist leer oder enthält sensible Zugangsdaten." };
    const query = command.query.slice(0, 500);
    const normalized = normalizeMemory({ type: "fact", content: command.replacement, importance: 0.7 });
    const { data: matches, error } = await supabase.from("memories").select("id, type, content, importance, metadata").eq("user_id", userId).ilike("content", `%${query}%`).limit(5);
    if (error) throw error;
    if (!matches?.length) return { ok: false, status: 404, reply: "Ich habe keine passende Erinnerung gefunden, die ich aktualisieren kann." };
    const target = matches[0];
    const { data, error: updateError } = await supabase.from("memories").update({ content: normalized.content, updated_at: new Date().toISOString() }).eq("id", target.id).eq("user_id", userId).select().single();
    if (updateError) throw updateError;
    return { ok: true, reply: "Aktualisiert. Die passende Erinnerung wurde geändert.", result: { memory: data } };
  }

  if (command.kind === "context") {
    const [{ data: projects, error: projectError }, { data: tasks, error: taskError }, { data: memories, error: memoryError }] = await Promise.all([
      supabase.from("projects").select("id, name, status, description").eq("user_id", userId).order("updated_at", { ascending: false }).limit(20),
      supabase.from("tasks").select("id, title, status, priority").eq("user_id", userId).order("updated_at", { ascending: false }).limit(20),
      supabase.from("memories").select("type, content, importance, updated_at").eq("user_id", userId).order("importance", { ascending: false }).order("updated_at", { ascending: false }).limit(50),
    ]);
    if (projectError) throw projectError;
    if (taskError) throw taskError;
    if (memoryError) throw memoryError;
    const reply = [
      `Projekte: ${projects?.length ?? 0}`,
      ...(projects ?? []).slice(0, 8).map((p: any) => `- ${p.name} (${p.status})`),
      `Aufgaben: ${tasks?.length ?? 0}`,
      ...(tasks ?? []).slice(0, 8).map((t: any) => `- ${t.title} (${t.status})`),
      `Gespeicherte Erinnerungen: ${memories?.length ?? 0}`,
    ].join("\n");
    return { ok: true, reply, result: { projects: projects ?? [], tasks: tasks ?? [], memories: memories ?? [] } };
  }

  if (command.kind === "verify") {
    const target = command.target.slice(0, 500);
    const [{ count: memoryCount, error: memoryError }, { count: projectCount, error: projectError }, { count: taskCount, error: taskError }] = await Promise.all([
      supabase.from("memories").select("id", { count: "exact", head: true }).eq("user_id", userId),
      supabase.from("projects").select("id", { count: "exact", head: true }).eq("user_id", userId),
      supabase.from("tasks").select("id", { count: "exact", head: true }).eq("user_id", userId),
    ]);
    if (memoryError) throw memoryError;
    if (projectError) throw projectError;
    if (taskError) throw taskError;
    return { ok: true, reply: `Geprüft: ${target}. Der aktuelle Datenzustand ist erreichbar: ${memoryCount ?? 0} Memories, ${projectCount ?? 0} Projekte, ${taskCount ?? 0} Aufgaben.`, result: { verified: true, target, counts: { memories: memoryCount ?? 0, projects: projectCount ?? 0, tasks: taskCount ?? 0 } } };
  }

  if (command.kind === "next" || command.kind === "continue" || command.kind === "think") {
    const [{ data: projects, error: projectError }, { data: tasks, error: taskError }] = await Promise.all([
      supabase.from("projects").select("name, status, updated_at").eq("user_id", userId).in("status", ["active", "paused"]).order("updated_at", { ascending: false }).limit(5),
      supabase.from("tasks").select("title, status, priority, updated_at").eq("user_id", userId).in("status", ["todo", "in_progress"]).order("priority", { ascending: true }).order("updated_at", { ascending: false }).limit(10),
    ]);
    if (projectError) throw projectError;
    if (taskError) throw taskError;
    const task = tasks?.[0];
    const project = projects?.[0];
    const reply = task ? `Mein bester nächster Schritt: ${task.title}.` : project ? `Mein bester nächster Schritt: am aktiven Projekt „${project.name}" weiterarbeiten.` : "Es gibt aktuell keinen offenen Arbeitsstand. Der nächste sinnvolle Schritt ist, ein Ziel oder Projekt festzulegen.";
    return { ok: true, reply, result: { recommendation: task ? { type: "task", value: task.title } : project ? { type: "project", value: project.name } : null, projects: projects ?? [], tasks: tasks ?? [] } };
  }

  return { ok: false, status: 400, reply: "Dieser Luna-Befehl ist nicht verfügbar." };
}
