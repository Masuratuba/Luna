import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("CI pipeline contains all quality gates", async () => {
  const workflow = await read(".github/workflows/ci.yml");
  for (const gate of ["npx tsc --noEmit", "npm run lint", "npm test", "npm run build"]) {
    assert.ok(workflow.includes(gate), `missing CI gate: ${gate}`);
  }
});

test("Guardian is fail-closed by default and has critical confirmation", async () => {
  const guard = await read("lib/luna/guard.ts");
  assert.match(guard, /fail-closed|failClosed|fail closed|fail closed by default/i);
  assert.match(guard, /CRITICAL/);
  assert.match(guard, /confirmationToken/);
});

test("Action engine delegates to the guarded executor", async () => {
  const engine = await read("lib/luna/action-engine.ts");
  assert.match(engine, /executeActionSafely/);
  assert.doesNotMatch(engine, /getToolPermission/);
});

test("Shop agent exists and routing gives it priority", async () => {
  const agents = await read("lib/luna/agents.ts");
  const router = await read("lib/luna/agent-orchestrator.ts");
  assert.match(agents, /id: "shop"/);
  assert.match(router, /isShopTask\(message\) \? "shop"/);
});

test("Financial boundary is disabled until a real provider is connected", async () => {
  const financial = await read("lib/luna/financial-boundary.ts");
  assert.match(financial, /enabled: false/);
  assert.match(financial, /maxTransactionEur/);
  assert.match(financial, /maxLoss24hEur/);
  assert.match(financial, /circuitBroken/);
});

test("No obvious hard-coded secret assignments in source", async () => {
  const files = ["lib/luna/guard.ts", "lib/luna/financial-boundary.ts", "app/api/chat/route.ts"];
  for (const file of files) {
    const source = await read(file);
    assert.doesNotMatch(source, /(?:OPENAI_API_KEY|SUPABASE_SERVICE_ROLE_KEY|LUNA_OWNER_SECRET)\s*=\s*["'][^"']+["']/);
  }
});
