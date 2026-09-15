import { parseMemoryUpdate, updateMemory } from "./memory/update";
import { forgetMemory } from "./memory/forget";

export type LunaCommand =
  | { kind: "forget"; query: string }
  | { kind: "update"; query: string; replacement: string }
  | { kind: "context" }
  | { kind: "verify"; target: string }
  | { kind: "next" }
  | { kind: "continue" }
  | { kind: "think" };

export function parseLunaCommand(message: string): LunaCommand | null {
  const text = message.trim();
  const lower = text.toLocaleLowerCase("de-DE");
  const forgetPrefix = /^(?:luna[, ]+)?(?:bitte\s+)?(?:vergiss|vergiß|lösche|loesche)(?:\s*,)?\s+/i;
  if (forgetPrefix.test(text)) return { kind: "forget", query: text.replace(forgetPrefix, "").trim() };
  const memoryUpdate = parseMemoryUpdate(text);
  if (memoryUpdate) return { kind: "update", query: memoryUpdate.target, replacement: memoryUpdate.replacement };
  if (/^luna[, ]+kontext\s*$/i.test(text) || lower === "kontext") return { kind: "context" };
  if (/^luna[, ]+prüf(?:e)?\s+(?:das|dies|dass?)?/i.test(text)) return { kind: "verify", target: text.replace(/^luna[, ]+prüf(?:e)?\s+/i, "").trim() || "aktuellen Zustand" };
  if (/^luna[, ]+was jetzt\??$/i.test(text)) return { kind: "next" };
  if (/^luna[, ]+mach weiter\s*$/i.test(text)) return { kind: "continue" };
  if (/^luna[, ]+denk(?:e)?\s+(?:selbst|weiter)\s*$/i.test(text)) return { kind: "think" };
  return null;
}

export async function executeLunaCommand(command: LunaCommand, supabase: any, userId: string) {
  if (command.kind === "forget") {
    const result = await forgetMemory(supabase, userId, `Vergiss ${command.query}`);
    if (!result.ok && result.reason === "NO_TARGET") return { ok: false, status: 400, reply: "Sag mir bitte, was ich vergessen soll." };
    if (!result.ok && result.reason === "NOT_FOUND") return { ok: true, reply: "Ich habe keine passende Erinnerung gefunden." };
    return { ok: true, reply: "Erledigt. Ich habe die passende Erinnerung gelöscht.", result };
  }

  if (command.kind === "update") {
    const result = await updateMemory(supabase, userId, `Ändere ${command.query} zu ${command.replacement}`);
    if (!result.ok && result.reason === "SENSITIVE") return { ok: false, status: 400, reply: "Die neue Information enthält sensible Zugangsdaten." };
    if (!result.ok && result.reason === "NOT_FOUND") return { ok: false, status: 404, reply: "Ich habe keine passende Erinnerung gefunden, die ich aktualisieren kann." };
    if (!result.ok) return { ok: false, status: 400, reply: "Sag mir bitte, was ich ändern soll und auf welchen neuen Wert." };
    return { ok: true, reply: "Aktualisiert. Die passende Erinnerung wurde geändert.", result };
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
