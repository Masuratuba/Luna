import type { AnalyticsProvider, AnalyticsRequest, AnalyticsResult, CommerceProduct, CommerceProvider, SearchProvider, SearchRequest, SearchResult } from "./contracts";
import { getOpenAI } from "../openai";

const PROVIDER_TIMEOUT_MS = 15_000;

async function postJson<T>(url: string, body: unknown, apiKey?: string): Promise<T> {
  let response: Response;
  try {
    response = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json", accept: "application/json", ...(apiKey ? { authorization: `Bearer ${apiKey}` } : {}) },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(PROVIDER_TIMEOUT_MS),
    });
  } catch (error: unknown) {
    if (error instanceof DOMException && error.name === "TimeoutError") {
      throw new Error("PROVIDER_REQUEST_TIMEOUT");
    }
    throw error;
  }

  if (!response.ok) throw new Error(`Provider request failed: ${response.status}`);

  const contentType = response.headers.get("content-type") || "";
  if (!contentType.toLowerCase().includes("application/json")) {
    throw new Error("PROVIDER_INVALID_CONTENT_TYPE");
  }

  return response.json() as Promise<T>;
}

/** Production search adapter. Search is routed through the server-side OpenAI web-search capability. */
export class HttpSearchProvider implements SearchProvider {
  readonly name = "openai-web-search";
  async search(request: SearchRequest): Promise<readonly SearchResult[]> {
    const query = request.query.trim();
    if (!query) throw new Error("SEARCH_QUERY_REQUIRED");
    const model = process.env.OPENAI_SEARCH_MODEL?.trim() || process.env.OPENAI_MODEL?.trim() || "gpt-5.6-luna";
    const response = await getOpenAI().responses.create({
      model,
      input: query,
      tools: [{ type: "web_search", search_context_size: "high" }],
    });
    return [{ title: "Luna Search", url: "", snippet: response.output_text || "" }];
  }
}

export class HttpAnalyticsProvider implements AnalyticsProvider {
  readonly name = "http-analytics";
  constructor(private readonly endpoint = process.env.ANALYTICS_PROVIDER_URL, private readonly apiKey = process.env.ANALYTICS_PROVIDER_API_KEY) {}
  async measure(request: AnalyticsRequest): Promise<AnalyticsResult> {
    if (!this.endpoint) throw new Error("ANALYTICS_PROVIDER_URL is not configured");
    return postJson<AnalyticsResult>(this.endpoint, request, this.apiKey);
  }
}

export class HttpCommerceProvider implements CommerceProvider {
  readonly name = "http-commerce";
  constructor(private readonly endpoint = process.env.COMMERCE_PROVIDER_URL, private readonly apiKey = process.env.COMMERCE_PROVIDER_API_KEY) {}
  async listProducts(query?: string): Promise<readonly CommerceProduct[]> {
    if (!this.endpoint) throw new Error("COMMERCE_PROVIDER_URL is not configured");
    return postJson<CommerceProduct[]>(`${this.endpoint}/products/search`, { query }, this.apiKey);
  }
  async publishProduct(product: CommerceProduct): Promise<{ id: string; published: boolean }> {
    if (!this.endpoint) throw new Error("COMMERCE_PROVIDER_URL is not configured");
    return postJson<{ id: string; published: boolean }>(`${this.endpoint}/products/publish`, product, this.apiKey);
  }
}
