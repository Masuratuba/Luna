import { buildShopWorkflow } from "./shop-agent";
import { DEFAULT_SHOP_FINANCE_CONFIG, evaluateShopTarget, type ProfitSnapshot, type ShopFinancialConfig } from "./shop-finance";
import { evaluateShopRisk, triggerShopCircuitBreaker } from "./shop-risk";

export type ShopOperatorState = "ready" | "running" | "target_reached" | "deactivated";

export function createShopOperator(config: ShopFinancialConfig = DEFAULT_SHOP_FINANCE_CONFIG) {
  const workflow = buildShopWorkflow();
  return { agent: "shop" as const, isolated: true as const, config, workflow, state: "ready" as ShopOperatorState };
}

export function evaluateShopOperator(snapshot: ProfitSnapshot, config: ShopFinancialConfig = DEFAULT_SHOP_FINANCE_CONFIG) {
  const target = evaluateShopTarget(snapshot, config);
  const risk = evaluateShopRisk(snapshot.netProfitEur, config.maxLossEur);
  if (risk.stop) return triggerShopCircuitBreaker("loss_limit");
  if (target.reached) return { state: "target_reached" as const, stop: false, reason: "24h profit target reached" };
  return { state: "running" as const, stop: false, reason: "target still in progress" };
}
