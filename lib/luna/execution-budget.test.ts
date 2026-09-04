import assert from "node:assert/strict";
import test from "node:test";
import { ExecutionBudget } from "./execution-budget";

test("execution budget bounds actions and tool calls", () => {
  const budget = new ExecutionBudget({ maxActions: 2, maxToolCalls: 1 });
  budget.consumeToolCall();
  assert.deepEqual(budget.snapshot(), { actions: 1, toolCalls: 1, remainingActions: 1, remainingToolCalls: 0 });
  assert.throws(() => budget.consumeToolCall(), /tool call limit exceeded/);
  budget.consumeAction();
  assert.throws(() => budget.consumeAction(), /execution action limit exceeded/);
});

test("invalid execution limits fail closed", () => {
  assert.throws(() => new ExecutionBudget({ maxActions: 0 }), /maxActions/);
  assert.throws(() => new ExecutionBudget({ maxToolCalls: 0 }), /maxToolCalls/);
});
