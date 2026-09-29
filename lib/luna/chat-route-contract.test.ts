import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

test("CP72 chat route is wired through Core, Guardian, and the tested default tool registry", async () => {
  const here = dirname(fileURLToPath(import.meta.url));
  const routePath = resolve(here, "../../app/api/chat/route.ts");
  const source = await readFile(routePath, "utf8");

  assert.match(source, /runLunaCore\(/);
  assert.match(source, /executeThroughGuardian\(/);
  assert.match(source, /createDefaultToolHandlerRegistry\(/);
  assert.match(source, /query:\s*message/);
  assert.match(source, /executeThroughGuardian\([\s\S]*toolRegistry,/);
  assert.doesNotMatch(source, /createProviderRegistry\(\)\.search\(\)\.search/);
  // The selected UI agent is the conversational persona; Core independently
  // selects the specialized execution agent and the API exposes both explicitly.
  assert.match(source, /Conversation agent: \\$\\{conversationAgent\\.name\\}/);
  assert.match(source, /agent:\s*conversationAgent\.id/);
  assert.match(source, /actionAgent:\s*core\.agent/);
});
