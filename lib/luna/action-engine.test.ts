import { describe, expect, it } from "vitest";
import { executeAction } from "./action-engine";

describe("action engine", () => {
  it("blocks destructive tool execution without confirmation", async () => {
    const result = await executeAction({ id: "test", type: "tool", status: "pending", input: { tool: "data.delete" } });
    expect(result.ok).toBe(false);
  });
});
