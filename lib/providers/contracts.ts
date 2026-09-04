export type ProviderHealth = "ready" | "disabled" | "error";

export type SearchRequest = Readonly<{ query: string; limit?: number }>;
export type SearchResult = Readonly<{ title: string; url: string; snippet?: string }>;
export interface SearchProvider {
  readonly name: string;
  search(request: SearchRequest): Promise<readonly SearchResult[]>;
}

export type WebFetchRequest = Readonly<{ url: string }>;
export type WebFetchResult = Readonly<{ url: string; content: string; truncated: boolean; untrusted: true }>;
export interface WebFetchProvider {
  readonly name: string;
  fetch(request: WebFetchRequest): Promise<WebFetchResult>;
}

export type MailReadRequest = Readonly<{ userId: string; limit?: number; unreadOnly?: boolean }>;
export type MailMessage = Readonly<{
  id: string;
  providerMessageId: string;
  threadId?: string;
  from: string;
  to: readonly string[];
  subject: string;
  text: string;
  receivedAt: string;
  unread: boolean;
}>;
export interface MailReadProvider {
  readonly name: string;
  listMessages(request: MailReadRequest): Promise<readonly MailMessage[]>;
}

export type AnalyticsRequest = Readonly<{ metric: string; dimensions?: Record<string, string> }>;
export type AnalyticsResult = Readonly<{ value: number; unit?: string; source: string }>;
export interface AnalyticsProvider {
  readonly name: string;
  measure(request: AnalyticsRequest): Promise<AnalyticsResult>;
}

export type CommerceProduct = Readonly<{ id: string; title: string; price?: number; currency?: string; url?: string }>;
export interface CommerceProvider {
  readonly name: string;
  listProducts(query?: string): Promise<readonly CommerceProduct[]>;
  publishProduct(product: CommerceProduct): Promise<{ id: string; published: boolean }>;
}

export type FinancialQuote = Readonly<{ amount: number; currency: string; source: string }>;
export interface FinancialProvider {
  readonly name: string;
  quote(): Promise<FinancialQuote>;
  transfer(): Promise<never>;
}

export type ProviderHealthReport = Readonly<Record<string, ProviderHealth>>;
