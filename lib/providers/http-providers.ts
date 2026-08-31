import type { AnalyticsProvider, AnalyticsRequest, AnalyticsResult, CommerceProduct, CommerceProvider, SearchProvider, SearchRequest, SearchResult } from "./contracts";
import { getOpenAI } from "../openai";

const PROVIDER_TIMEOUT_MS = 15_000;
const DEFAULT_SEARCH_LIMIT = 5;
const MAX_SEARCH_LIMIT = 10;

type WebCitation = Readonly<{ url?: unknown; title?: unknown }>;

type SearchOutput = Readonly<{
  output_text?: unknown;
  output?: unknown;
}>;

function isHttpUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:";
  } catch {
    return false;
  }
}

export function extractSearchResults(response: SearchOutput, limit: number): readonly SearchResult[] {
  const text = typeof response.output_text === "string" ? response.output_text.trim() : "";
  const results: SearchResult[] = [];
  const seen = new Set<string>();
  const output = Array.isArray(response.output) ? response.output : [];

  for (const item of output) {
    if (!item || typeof item !== "object") continue;
    const content = "content" in item && Array.isArray(item.content) ? item.content : [];
    for (const part of content) {
      if (!part || typeof part !== "object" || !("annotations" in part) || !Array.isArray(part.annotations)) continue;
      for (const annotation of part.annotations) {
        if (!annotation || typeof annotation !== "object") continue;
        if (!("type" in annotation) || annotation.type !== "url_citation") continue;
        const citation = "url_citation" in annotation ? annotation.url_citation : undefined;
        if (!citation || typeof citation !== "object") continue;
        const typedCitation = citation as WebCitation;
        const url = typeof typedCitation.url === "string" ? typedCitation.url.trim() : "";
        if (!url || !isHttpUrl(url) || seen.has(url)) continue;
        const title = typeof typedCitation.title === "string" && typedCitation.title.trim() ? typedCitation.title.trim() : url;
        seen.add(url);
        results.push({ title, url, snippet: text });
        if (results.length >= limit) return results;
      }
    }
  }

  return results.length > 0 ? results : [];
}

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
    if (error instanceof DOMException && error.name === "TimeoutError") throw new Error("PROVIDER_REQUEST_TIMEOUT");
    throw error;
  }

  if (!response.ok) throw new Error(`Provider request failed: ${response.status}`);
  const contentType = response.headers.get("content-type") || "";
  if (!contentType.toLowerCase().includes("application/json")) throw new Error("PROVIDER_INVALID_CONTENT_TYPE");
  return response.json() as Promise<T>;
}

/** Production search adapter. Search is routed through the server-side OpenAI web-search capability. */
export class HttpSearchProvider implements SearchProvider {
  readonly name = "openai-web-search";
  async search(request: SearchRequest): Promise<readonly SearchResult[]> {
    const query = request.query.trim();
    if (!query) throw new Error("SEARCH_QUERY_REQUIRED");
    const requestedLimit = Number.isFinite(request.limit) ? Math.floor(request.limit as number) : DEFAULT_SEARCH_LIMIT;
    const limit = Math.min(MAX_SEARCH_LIMIT, Math.max(1, requestedLimit));
    const model = process.env.OPENAI_SEARCH_MODEL?.trim() || process.env.OPENAI_MODEL?.trim() || "gpt-5.6-luna";
    const response = await getOpenAI().responses.create({
      model,
      input: query,
      tools: [{ type: "web_search", search_context_size: "high" }],
      store: false,
    });
    return extractSearchResults(response, limit);
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
