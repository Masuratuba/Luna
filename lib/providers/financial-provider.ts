import type { FinancialProvider, FinancialQuote } from "./contracts";

/** Fail-closed financial adapter. No money movement is possible until a vetted provider is explicitly configured. */
export class DisabledFinancialProvider implements FinancialProvider {
  readonly name = "financial-disabled";

  async quote(): Promise<FinancialQuote> {
    throw new Error("FINANCIAL_PROVIDER_NOT_CONFIGURED");
  }

  async transfer(): Promise<never> {
    throw new Error("FINANCIAL_TRANSFER_DISABLED");
  }
}
