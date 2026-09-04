import { DisabledFinancialProvider } from "./financial-provider";
import { HttpAnalyticsProvider, HttpCommerceProvider, HttpSearchProvider } from "./http-providers";
import { HttpWebFetchProvider } from "./web-provider";
import { OpenAIProvider } from "./openai-provider";

export function createProviderRegistry() {
  return {
    openai: () => new OpenAIProvider(),
    search: () => new HttpSearchProvider(),
    web: () => new HttpWebFetchProvider(),
    analytics: () => new HttpAnalyticsProvider(),
    commerce: () => new HttpCommerceProvider(),
    financial: () => new DisabledFinancialProvider(),
  } as const;
}
