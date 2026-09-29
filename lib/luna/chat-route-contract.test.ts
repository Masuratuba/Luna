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
});
