import assert from "node:assert/strict";
import test from "node:test";
import { getLunaHealth } from "./diagnostics";

const envKeys = [
  "OPENAI_API_KEY",
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "ANALYTICS_PROVIDER_URL",
  "COMMERCE_PROVIDER_URL",
] as const;

test("health reports provider readiness explicitly", () => {
  const previous = Object.fromEntries(envKeys.map((key) => [key, process.env[key]]));
  try {
    process.env.OPENAI_API_KEY = "test-key";
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://supabase.test";
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = "publishable-test-key";
    delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    process.env.ANALYTICS_PROVIDER_URL = "https://analytics.test";
    process.env.COMMERCE_PROVIDER_URL = "https://commerce.test";

    const health = getLunaHealth();
    assert.equal(health.checks.openai, "ok");
    assert.equal(health.checks.search, "ok");
    assert.equal(health.checks.analytics, "ok");
    assert.equal(health.checks.commerce, "ok");
    assert.equal(health.checks.supabase, "ok");
    assert.equal(health.checks.financial, "not_configured");
    assert.equal(health.status, "degraded");
  } finally {
    for (const key of envKeys) {
      const value = previous[key];
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  }
});

test("search is not reported ready when OpenAI is unavailable", () => {
  const previous = process.env.OPENAI_API_KEY;
  try {
    delete process.env.OPENAI_API_KEY;
    const health = getLunaHealth();
    assert.equal(health.checks.openai, "not_configured");
    assert.equal(health.checks.search, "not_configured");
  } finally {
    if (previous === undefined) delete process.env.OPENAI_API_KEY;
    else process.env.OPENAI_API_KEY = previous;
  }
});
