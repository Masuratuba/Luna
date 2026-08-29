export type LunaHealth = {
  status: "ok" | "degraded";
  checks: Record<string, "ok" | "not_configured" | "error">;
  timestamp: string;
};

/**
 * Health is intentionally explicit: local modules are healthy independently
 * from optional external credentials. Missing credentials are reported as
 * not_configured instead of being mistaken for a working integration.
 */
export function getLunaHealth(): LunaHealth {
  const checks = {
    core: "ok" as const,
    memory: "ok" as const,
    guard: "ok" as const,
    planner: "ok" as const,
    actionEngine: "ok" as const,
    eventBus: "ok" as const,
    audit: "ok" as const,
    openai: process.env.OPENAI_API_KEY?.trim() ? "ok" as const : "not_configured" as const,
    supabase:
      process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() &&
      (process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim() || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim())
        ? "ok" as const
        : "not_configured" as const,
  };

  const status = Object.values(checks).every((value) => value === "ok") ? "ok" : "degraded";
  return { status, checks, timestamp: new Date().toISOString() };
}
