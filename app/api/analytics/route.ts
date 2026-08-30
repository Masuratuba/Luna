import { NextResponse } from "next/server";
import { getAgentAccess } from "../../../lib/luna/agent-isolation";
import { requireUser } from "../../../lib/supabase/auth";
import { createProviderRegistry } from "../../../lib/providers/registry";
import { parseAnalyticsRequest, validateAnalyticsResult } from "../../../lib/providers/analytics-validation";

export async function POST(request: Request) {
  try {
    const { supabase, user } = await requireUser();
    const access = getAgentAccess("analysis", "analytics", "read");
    if (!access.allowed) return NextResponse.json({ error: "analytics capability denied" }, { status: 403 });

    const body = await request.json();
    const analyticsRequest = parseAnalyticsRequest(body);
    const provider = createProviderRegistry().analytics();
    const result = validateAnalyticsResult(await provider.measure(analyticsRequest));

    const { error: eventError } = await supabase.from("luna_events").insert({
      user_id: user.id,
      event_type: "analytics.completed",
      data: { metric: analyticsRequest.metric, provider: provider.name },
    });
    if (eventError) console.error("Luna analytics event error", eventError);

    return NextResponse.json({ ok: true, ...analyticsRequest, result, provider: provider.name });
  } catch (error: unknown) {
    if (error instanceof Error) {
      if (error.message === "UNAUTHORIZED") return NextResponse.json({ error: "authentication required" }, { status: 401 });
      if (error.message === "SUPABASE_NOT_CONFIGURED") return NextResponse.json({ error: "Supabase is not configured" }, { status: 503 });
      if (error.message.startsWith("ANALYTICS_")) return NextResponse.json({ error: error.message }, { status: 400 });
      if (error.message === "ANALYTICS_PROVIDER_URL is not configured") return NextResponse.json({ error: "analytics provider is not configured" }, { status: 503 });
    }
    console.error("Luna analytics error", error);
    return NextResponse.json({ error: "analytics failed" }, { status: 502 });
  }
}
