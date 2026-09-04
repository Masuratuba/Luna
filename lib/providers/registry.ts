import { DisabledFinancialProvider } from "./financial-provider";
import { HttpAnalyticsProvider, HttpCommerceProvider, HttpSearchProvider } from "./http-providers";
import { DurableMailProvider } from "./mail-provider";
import { DurableAuditProvider } from "./audit-provider";
import { HttpWebFetchProvider } from "./web-provider";
import { OpenAIProvider } from "./openai-provider";
import { DurableMailSendProvider } from "./mail-send-provider";

export function createProviderRegistry() {
  return {
    openai: () => new OpenAIProvider(),
    search: () => new HttpSearchProvider(),
    web: () => new HttpWebFetchProvider(),
    mail: () => new DurableMailProvider(),
    mailSend: () => new DurableMailSendProvider(),
    audit: () => new DurableAuditProvider(),
    analytics: () => new HttpAnalyticsProvider(),
    commerce: () => new HttpCommerceProvider(),
    financial: () => new DisabledFinancialProvider(),
  } as const;
}
