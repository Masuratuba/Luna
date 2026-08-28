import { NextResponse } from "next/server";
import { getOpenAI } from "../../../../lib/openai";
import { createSupabaseAdminClient } from "../../../../lib/supabase/admin";

function nextRun(schedule: string, now: Date): Date | null {
  const trimmed = schedule.trim();
  if (!trimmed) return null;
  if (/^\d{4}-\d{2}-\d{2}T/.test(trimmed)) {
    const d = new Date(trimmed);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  const rule = trimmed.replace(/^BEGIN:VEVENT\s*/i, "").replace(/\s*END:VEVENT$/i, "");
  const freq = rule.match(/FREQ=(HOURLY|DAILY|WEEKLY)/i)?.[1]?.toUpperCase();
  if (!freq) return null;
  const d = new Date(now);
  if (freq === "HOURLY") d.setHours(d.getHours() + 1, 0, 0, 0);
  if (freq === "DAILY") d.setDate(d.getDate() + 1), d.setHours(8, 0, 0, 0);
  if (freq === "WEEKLY") d.setDate(d.getDate() + 7), d.setHours(8, 0, 0, 0);
  return d;
}

export async function GET(request: Request) {
  const expected = process.env.CRON_SECRET;
  if (expected && request.headers.get("authorization") !== `Bearer ${expected}`) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  try {
    const supabase = createSupabaseAdminClient();
    const now = new Date();
    const { data: jobs, error } = await supabase.from("automations").select("*").eq("enabled", true).lte("next_run_at", now.toISOString()).limit(25);
    if (error) throw error;

    const results = [];
    for (const job of jobs ?? []) {
      try {
        const response = await getOpenAI().responses.create({
          model: "gpt-5.6-luna",
          instructions: "You are executing a scheduled LUNA automation. Perform the requested task concisely. Do not claim to have contacted people or changed external systems unless a connected tool actually did so.",
          input: job.prompt,
        });
        const output = response.output_text || "Keine Ausgabe.";
        const conversation = await supabase.from("conversations").insert({ user_id: job.user_id, title: `Automation: ${job.title}` }).select("id").single();
        if (!conversation.error && conversation.data) {
          await supabase.from("messages").insert([
            { conversation_id: conversation.data.id, user_id: job.user_id, role: "user", content: `[Automation] ${job.prompt}` },
            { conversation_id: conversation.data.id, user_id: job.user_id, role: "assistant", content: output },
          ]);
        }
        const next = nextRun(job.schedule, now);
        await supabase.from("automations").update({ last_run_at: now.toISOString(), next_run_at: next?.toISOString() ?? null, enabled: next ? true : false, updated_at: now.toISOString() }).eq("id", job.id);
        results.push({ id: job.id, ok: true });
      } catch (error) {
        console.error("Automation job error", job.id, error);
        results.push({ id: job.id, ok: false });
      }
    }
    return NextResponse.json({ ok: true, processed: results });
  } catch (error) {
    console.error("Automation cron error", error);
    return NextResponse.json({ error: "automation runner failed" }, { status: 500 });
  }
}
