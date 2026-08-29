export type ShopRiskState = "active" | "target_reached" | "loss_limit" | "deactivated";

export function evaluateShopRisk(netProfitEur: number, maxLossEur: number): { state: ShopRiskState; stop: boolean } {
  if (netProfitEur <= -Math.abs(maxLossEur)) return { state: "loss_limit", stop: true };
  return { state: "active", stop: false };
}

/** Circuit breaker: deactivation is reversible; it does not delete agent data. */
export function triggerShopCircuitBreaker(reason: "loss_limit" | "target_timeout" | "manual") {
  return { state: "deactivated" as const, stop: true, reason, preserveData: true, cancelPendingActions: true };
}
