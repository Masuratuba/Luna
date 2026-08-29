export type ShopFinancialConfig = {
  targetProfitEur: number;
  targetWindowHours: number;
  maxLossEur: number;
  maxTransactionEur: number;
  maxDailySpendEur: number;
  requireApprovalForPayouts: boolean;
};

export const DEFAULT_SHOP_FINANCE_CONFIG: ShopFinancialConfig = {
  targetProfitEur: 15,
  targetWindowHours: 24,
  maxLossEur: 10,
  maxTransactionEur: 25,
  maxDailySpendEur: 50,
  requireApprovalForPayouts: true,
};

export function validateShopFinancialConfig(config: ShopFinancialConfig): ShopFinancialConfig {
  if (!Number.isFinite(config.targetProfitEur) || config.targetProfitEur < 0) throw new Error("Invalid profit target");
  if (!Number.isFinite(config.targetWindowHours) || config.targetWindowHours <= 0) throw new Error("Invalid target window");
  if (!Number.isFinite(config.maxLossEur) || config.maxLossEur < 0) throw new Error("Invalid loss limit");
  if (!Number.isFinite(config.maxTransactionEur) || config.maxTransactionEur <= 0) throw new Error("Invalid transaction limit");
  if (!Number.isFinite(config.maxDailySpendEur) || config.maxDailySpendEur < 0) throw new Error("Invalid daily spend limit");
  return { ...config };
}

export type ProfitSnapshot = {
  revenueEur: number;
  costsEur: number;
  feesEur: number;
  netProfitEur: number;
  windowStartedAt: string;
};

export function calculateNetProfit(revenueEur: number, costsEur: number, feesEur: number) {
  return Number((revenueEur - costsEur - feesEur).toFixed(2));
}

export function evaluateShopTarget(snapshot: ProfitSnapshot, config: ShopFinancialConfig) {
  const reached = snapshot.netProfitEur >= config.targetProfitEur;
  const lossLimitHit = snapshot.netProfitEur <= -Math.abs(config.maxLossEur);
  return { reached, lossLimitHit, status: lossLimitHit ? "stop" : reached ? "target_reached" : "running" as const };
}
