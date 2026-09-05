import { DisabledFinancialProvider } from "./financial-provider";
import { HttpAnalyticsProvider, HttpCommerceProvider, HttpSearchProvider } from "./http-providers";
import { MicrosoftGraphMailProvider } from "./mail";
import { OpenAIProvider } from "./openai-provider";

export function createProviderRegistry() {
  return {
    openai: () => new OpenAIProvider(),
    search: () => new HttpSearchProvider(),
    analytics: () => new HttpAnalyticsProvider(),
    commerce: () => new HttpCommerceProvider(),
    mail: () => new MicrosoftGraphMailProvider(),
    financial: () => new DisabledFinancialProvider(),
  } as const;
}
