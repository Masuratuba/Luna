export type ExecutionBudgetOptions = {
  maxToolCalls?: number;
  maxActions?: number;
};

export class ExecutionBudget {
  readonly maxToolCalls: number;
  readonly maxActions: number;
  private toolCalls = 0;
  private actions = 0;

  constructor(options: ExecutionBudgetOptions = {}) {
    this.maxToolCalls = options.maxToolCalls ?? 20;
    this.maxActions = options.maxActions ?? 30;
    if (!Number.isInteger(this.maxToolCalls) || this.maxToolCalls < 1) throw new Error("maxToolCalls must be a positive integer");
    if (!Number.isInteger(this.maxActions) || this.maxActions < 1) throw new Error("maxActions must be a positive integer");
  }

  consumeAction(): void {
    if (this.actions >= this.maxActions) throw new Error("execution action limit exceeded");
    this.actions += 1;
  }

  consumeToolCall(): void {
    this.consumeAction();
    if (this.toolCalls >= this.maxToolCalls) {
      this.actions -= 1;
      throw new Error("tool call limit exceeded");
    }
    this.toolCalls += 1;
  }

  snapshot() {
    return {
      actions: this.actions,
      toolCalls: this.toolCalls,
      remainingActions: this.maxActions - this.actions,
      remainingToolCalls: this.maxToolCalls - this.toolCalls,
    };
  }
}
