export type ShopLedgerEntry = {
  id: string;
  type: "sale" | "cost" | "fee" | "payout";
  amountEur: number;
  reference: string;
  createdAt: string;
};

export function summarizeLedger(entries: readonly ShopLedgerEntry[]) {
  const revenue = entries.filter((e) => e.type === "sale").reduce((s, e) => s + e.amountEur, 0);
  const costs = entries.filter((e) => e.type === "cost").reduce((s, e) => s + e.amountEur, 0);
  const fees = entries.filter((e) => e.type === "fee").reduce((s, e) => s + e.amountEur, 0);
  const payouts = entries.filter((e) => e.type === "payout").reduce((s, e) => s + e.amountEur, 0);
  return {
    revenueEur: Number(revenue.toFixed(2)),
    costsEur: Number(costs.toFixed(2)),
    feesEur: Number(fees.toFixed(2)),
    payoutsEur: Number(payouts.toFixed(2)),
    netProfitEur: Number((revenue - costs - fees).toFixed(2)),
  };
}
