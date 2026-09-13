import { NextResponse } from "next/server";
import { createSupabaseServiceClient } from "../../../../lib/supabase/server";
import { isLoginBypassed } from "../../../../lib/supabase/mode";
import { getOpenAI } from "../../../../lib/openai";

export async function GET() {
  if (!isLoginBypassed()) return new NextResponse(null, { status: 404 });

  const result: Record<string, unknown> = {
    testMode: true,
    supabaseUrl: Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL),
    supabaseServiceKey: Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY),
    openaiKey: Boolean(process.env.OPENAI_API_KEY),
    model: process.env.OPENAI_MODEL?.trim() || "gpt-5.6-luna",
  };

  try {
    const supabase = createSupabaseServiceClient();
    if (!supabase) throw new Error("SUPABASE_NOT_CONFIGURED");

    const { data: users, error: usersError } = await supabase.auth.admin.listUsers({ page: 1, perPage: 1 });
    if (usersError) throw new Error(`SUPABASE_AUTH: ${usersError.message}`);
    result.supabaseAuth = true;
    result.userAvailable = Boolean(users.users[0]?.id);

    const { error: conversationsError } = await supabase.from("conversations").select("id").limit(1);
    if (conversationsError) throw new Error(`SUPABASE_DB: ${conversationsError.message}`);
    result.database = true;

    const response = await getOpenAI().responses.create({
      model: String(result.model),
      store: false,
      input: "Reply with exactly OK.",
    });
    result.openai = true;
    result.reply = response.output_text || "";

    return NextResponse.json({ ok: true, ...result });
  } catch (error: unknown) {
    const err = error as { status?: number; code?: string; message?: string };
    return NextResponse.json(
      { ok: false, ...result, error: err.message || "unknown error", code: err.code || null },
      { status: Number(err.status) >= 400 && Number(err.status) < 600 ? Number(err.status) : 500 },
    );
  }
}
