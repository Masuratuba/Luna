import { checkGuard, type GuardRole } from "./guard";
import type { LunaAction } from "./core";

export type FinancialConfig = {
  targetProfit24hEur: number;
  maxLoss24hEur: number;
  maxTransactionEur: number;
  enabled: boolean;
};

export const DEFAULT_FINANCIAL_CONFIG: FinancialConfig = {
  targetProfit24hEur: 15,
  maxLoss24hEur: 25,
  maxTransactionEur: 25,
  enabled: false,
};

export type FinancialState = {
  profit24hEur: number;
  loss24hEur: number;
  spent24hEur: number;
  circuitBroken: boolean;
};

export type FinancialDecision =
  | { allowed: true; reason: string }
  | { allowed: false; reason: string };

export function evaluateFinancialAction(args: {
  operation: "balance" | "quote" | "authorize" | "execute" | "withdraw" | "transfer" | "sign";
  amountEur?: number;
  config?: FinancialConfig;
  state?: FinancialState;
  role?: GuardRole;
  authenticated?: boolean;
  approved?: boolean;
  confirmationToken?: string;
}): FinancialDecision {
  const config = args.config ?? DEFAULT_FINANCIAL_CONFIG;
  const state = args.state ?? { profit24hEur: 0, loss24hEur: 0, spent24hEur: 0, circuitBroken: false };
  if (!config.enabled) return { allowed: false, reason: "financial boundary disabled" };
  if (state.circuitBroken) return { allowed: false, reason: "financial circuit breaker active" };
  const amount = Math.max(0, args.amountEur ?? 0);
  if (amount > config.maxTransactionEur) return { allowed: false, reason: "transaction limit exceeded" };
  if (state.loss24hEur >= config.maxLoss24hEur) return { allowed: false, reason: "24h loss limit reached" };
  if (["withdraw", "transfer", "sign", "execute", "authorize"].includes(args.operation)) {
    const action: LunaAction = { id: crypto.randomUUID(), type: "tool", status: "pending", input: { tool: `wallet.${args.operation}` } };
    const guard = checkGuard({ action, authenticated: Boolean(args.authenticated), role: args.role, approved: args.approved, confirmationToken: args.confirmationToken, adminAuthenticated: args.role === "admin" && Boolean(args.authenticated) });
    if (!guard.allowed) return { allowed: false, reason: guard.reason };
  }
  return { allowed: true, reason: "financial boundary approved; provider execution remains external" };
}

export function financialStatus(config: FinancialConfig = DEFAULT_FINANCIAL_CONFIG, state: FinancialState = { profit24hEur: 0, loss24hEur: 0, spent24hEur: 0, circuitBroken: false }) {
  const targetReached = state.profit24hEur >= config.targetProfit24hEur;
  const riskBreached = state.loss24hEur >= config.maxLoss24hEur || state.circuitBroken;
  return { targetReached, riskBreached, shouldStop: riskBreached, targetProfit24hEur: config.targetProfit24hEur, maxLoss24hEur: config.maxLoss24hEur };
}
