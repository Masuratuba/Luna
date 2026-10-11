"use client";

import { useCallback, useEffect, useState } from "react";

type Task = { id: string; title: string; description?: string | null; status: "todo" | "in_progress" | "completed" | "cancelled"; priority: number; due_at?: string | null };

const statusLabels = { todo: "Offen", in_progress: "In Arbeit", completed: "Erledigt", cancelled: "Abgebrochen" };

export default function LunaTasks() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [title, setTitle] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const loadTasks = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/tasks", { cache: "no-store" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Aufgaben konnten nicht geladen werden.");
      setTasks(Array.isArray(data.tasks) ? data.tasks.map((task: Record<string, unknown>) => ({
        id: String(task.id), title: String(task.title ?? ""), description: typeof task.description === "string" ? task.description : null,
        status: task.status === "in_progress" || task.status === "completed" || task.status === "cancelled" ? task.status : "todo",
        priority: Number(task.priority ?? 3), due_at: typeof task.due_at === "string" ? task.due_at : null
      })) : []);
    } catch (e) { setError(e instanceof Error ? e.message : "Unbekannter Fehler."); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { void loadTasks(); }, [loadTasks]);

  async function addTask(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const clean = title.trim();
    if (!clean || saving) return;
    setSaving(true); setError("");
    try {
      const response = await fetch("/api/tasks", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ title: clean }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Aufgabe konnte nicht angelegt werden.");
      setTitle("");
      await loadTasks();
    } catch (e) { setError(e instanceof Error ? e.message : "Unbekannter Fehler."); }
    finally { setSaving(false); }
  }

  async function updateStatus(task: Task) {
    const next = task.status === "completed" ? "todo" : "completed";
    try {
      const response = await fetch(`/api/tasks/${encodeURIComponent(task.id)}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status: next }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Status konnte nicht geändert werden.");
      setTasks((current) => current.map((item) => item.id === task.id ? { ...item, status: next } : item));
    } catch (e) { setError(e instanceof Error ? e.message : "Unbekannter Fehler."); }
  }

  return (
    <section className="luna-page-panel">
      <div className="luna-page-heading"><div><span className="eyebrow">PERSONAL WORKSPACE</span><h1>Deine Aufgaben</h1><p>Halte fest, was als Nächstes wichtig ist.</p></div><span className="section-count">{tasks.filter((task) => task.status !== "completed" && task.status !== "cancelled").length} offen</span></div>
      <form className="luna-task-form" onSubmit={addTask}><label className="sr-only" htmlFor="new-task">Neue Aufgabe</label><input id="new-task" value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Was möchtest du erledigen?" maxLength={180} required /><button type="submit" disabled={!title.trim() || saving}>{saving ? "Speichert …" : "＋ Aufgabe"}</button></form>
      {error && <p className="luna-inline-error" role="alert">{error} <button type="button" onClick={() => void loadTasks()}>Erneut versuchen</button></p>}
      {loading ? <p className="luna-empty-state">Aufgaben werden geladen …</p> : tasks.length === 0 ? <div className="luna-empty-state"><span>✦</span><strong>Noch keine Aufgaben</strong><p>Lege oben deine erste Aufgabe an.</p></div> : <div className="luna-task-list">{tasks.map((task) => <article className={`luna-task-item ${task.status === "completed" ? "is-complete" : ""}`} key={task.id}><button className="luna-task-check" type="button" onClick={() => void updateStatus(task)} aria-label={task.status === "completed" ? "Als offen markieren" : "Als erledigt markieren"}>{task.status === "completed" ? "✓" : ""}</button><div className="luna-task-copy"><strong>{task.title}</strong>{task.description && <p>{task.description}</p>}<small>{statusLabels[task.status]} · Priorität {task.priority}{task.due_at ? ` · Fällig ${new Date(task.due_at).toLocaleDateString("de-DE")}` : ""}</small></div></article>)}</div>}
    </section>
  );
}
