import assert from "node:assert/strict";
import test from "node:test";
import { executeAction } from "./action-engine";

test("action engine blocks destructive tool execution without confirmation", async () => {
  const result = await executeAction({
    id: "test",
    type: "tool",
    status: "pending",
    input: { tool: "data.delete" },
  });

  assert.equal(result.ok, false);
});
