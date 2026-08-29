export type WalletOperation = "balance.read" | "transaction.prepare" | "payout.request";

export type WalletGateway = {
  provider: string;
  walletRef: string;
  connected: boolean;
  secretMaterialExposed: false;
};

export type WalletPolicy = {
  maxTransactionEur: number;
  maxDailySpendEur: number;
  requireApprovalForPayouts: boolean;
};

export function authorizeWalletOperation(operation: WalletOperation, amountEur: number | undefined, policy: WalletPolicy) {
  if (amountEur !== undefined && (!Number.isFinite(amountEur) || amountEur < 0)) {
    return { allowed: false, requiresApproval: true, reason: "invalid amount" };
  }
  if (amountEur !== undefined && amountEur > policy.maxTransactionEur) {
    return { allowed: false, requiresApproval: true, reason: "transaction limit exceeded" };
  }
  if (operation === "payout.request") {
    return { allowed: true, requiresApproval: policy.requireApprovalForPayouts, reason: "payout requires controlled gateway" };
  }
  return { allowed: true, requiresApproval: false, reason: "wallet operation allow-listed" };
}

/** Placeholder gateway. It deliberately cannot expose or return wallet private keys. */
export function createWalletGateway(provider: string, walletRef: string): WalletGateway {
  return { provider, walletRef, connected: false, secretMaterialExposed: false };
}
