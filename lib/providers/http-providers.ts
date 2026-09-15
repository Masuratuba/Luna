import type { AnalyticsProvider, AnalyticsRequest, AnalyticsResult, CommerceProduct, CommerceProvider, SearchProvider, SearchRequest, SearchResult } from "./contracts";
import { getOpenAI } from "../openai";
import { validateAnalyticsResult } from "./analytics-validation";
import { validateCommerceProducts, validatePublishResult } from "./commerce-validation";

const PROVIDER_TIMEOUT_MS = 45_000;
const DEFAULT_SEARCH_LIMIT = 5;
const MAX_SEARCH_LIMIT = 10;

type WebCitation = Readonly<{ url?: unknown; title?: unknown }>;
type SearchOutput = Readonly<{ output_text?: unknown; output?: unknown }>;
type ChatSearchMessage = Readonly<{ content?: unknown; annotations?: unknown }>;

function isHttpUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:";
  } catch {
    return false;
  }
}

function normalizeProviderEndpoint(value: string): string {
  const trimmed = value.trim();
  try {
    const url = new URL(trimmed);
    if (url.protocol !== "https:" && url.protocol !== "http:") throw new Error("PROVIDER_INVALID_URL");
    return url.toString().replace(/\/$/, "");
  } catch {
    throw new Error("PROVIDER_INVALID_URL");
  }
}

export function extractSearchResults(response: SearchOutput, limit: number): readonly SearchResult[] {
  const text = typeof response.output_text === "string" ? response.output_text.trim() : "";
  const results: SearchResult[] = [];
  const seen = new Set<string>();
  const output = Array.isArray(response.output) ? response.output : [];

  for (const item of output) {
    if (!item || typeof item !== "object") continue;

    if ("type" in item && item.type === "web_search_call") {
      const action = "action" in item && item.action && typeof item.action === "object" ? item.action as { sources?: unknown } : undefined;
      if (action && Array.isArray(action.sources)) {
        for (const source of action.sources) {
          if (!source || typeof source !== "object") continue;
          const typedSource = source as WebCitation;
          const url = typeof typedSource.url === "string" ? typedSource.url.trim() : "";
          if (!url || !isHttpUrl(url) || seen.has(url)) continue;
          const title = typeof typedSource.title === "string" && typedSource.title.trim() ? typedSource.title.trim() : url;
          seen.add(url);
          results.push({ title, url, snippet: text });
          if (results.length >= limit) return results;
        }
      }
    }

    const content = "content" in item && Array.isArray(item.content) ? item.content : [];
    for (const part of content) {
      if (!part || typeof part !== "object" || !("annotations" in part) || !Array.isArray(part.annotations)) continue;
      for (const annotation of part.annotations) {
        if (!annotation || typeof annotation !== "object") continue;
        if (!("type" in annotation) || annotation.type !== "url_citation") continue;
        const direct = annotation as WebCitation;
        const nested = "url_citation" in annotation && annotation.url_citation && typeof annotation.url_citation === "object"
          ? annotation.url_citation as WebCitation
          : undefined;
        const url = typeof direct.url === "string" ? direct.url.trim() : typeof nested?.url === "string" ? nested.url.trim() : "";
        if (!url || !isHttpUrl(url) || seen.has(url)) continue;
        const titleValue = typeof direct.title === "string" && direct.title.trim()
          ? direct.title.trim()
          : typeof nested?.title === "string" && nested.title.trim()
            ? nested.title.trim()
            : url;
        seen.add(url);
        results.push({ title: titleValue, url, snippet: text });
        if (results.length >= limit) return results;
      }
    }
  }

  if (text) return [{ title: "OpenAI Web-Recherche", snippet: text }];
  return results;
}

export function extractChatSearchResults(message: ChatSearchMessage, limit: number): readonly SearchResult[] {
  const text = typeof message.content === "string" ? message.content.trim() : "";
  const annotations = Array.isArray(message.annotations) ? message.annotations : [];
  const results: SearchResult[] = [];
  const seen = new Set<string>();

  for (const annotation of annotations) {
    if (!annotation || typeof annotation !== "object") continue;
    const direct = annotation as WebCitation & { type?: unknown; url_citation?: unknown };
    if (direct.type !== "url_citation") continue;
    const nested = direct.url_citation && typeof direct.url_citation === "object" ? direct.url_citation as WebCitation : undefined;
    const url = typeof direct.url === "string" ? direct.url.trim() : typeof nested?.url === "string" ? nested.url.trim() : "";
    if (!url || !isHttpUrl(url) || seen.has(url)) continue;
    const title = typeof direct.title === "string" && direct.title.trim()
      ? direct.title.trim()
      : typeof nested?.title === "string" && nested.title.trim()
        ? nested.title.trim()
        : url;
    seen.add(url);
    results.push({ title, url, snippet: text });
    if (results.length >= limit) return results;
  }

  return text ? [{ title: "OpenAI Web-Recherche", snippet: text }] : results;
}

export class HttpSearchProvider implements SearchProvider {
  readonly name = "openai-web-search";

  async search(request: SearchRequest): Promise<readonly SearchResult[]> {
    const query = request.query.trim();
    if (!query) throw new Error("SEARCH_QUERY_REQUIRED");
    const requestedLimit = Number.isFinite(request.limit) ? Math.floor(request.limit as number) : DEFAULT_SEARCH_LIMIT;
    const limit = Math.min(MAX_SEARCH_LIMIT, Math.max(1, requestedLimit));
    const model = process.env.OPENAI_SEARCH_MODEL?.trim() || "gpt-5-search-api";
    const input = `Search the live web and answer this user request with current, concrete information. This is a research operation, not a general-knowledge answer. For travel requests, check actual current transport providers and booking/search pages for the requested date, route, transport modes and prices where available. Compare the cheapest realistic options and clearly distinguish exact fares from estimates. Prefer official provider sources. Include source URLs when available.\n\nUser request: ${query}`;

    try {
      // gpt-5-search-api is the dedicated Chat Completions search model. The search option is
      // required to use the web-search integration, and the request gets an explicit bounded
      // timeout so a slow live-search call cannot hang the Research Agent indefinitely.
      const response = await getOpenAI().chat.completions.create({
        model,
        web_search_options: {},
        messages: [{ role: "user", content: input }],
      }, {
        timeout: PROVIDER_TIMEOUT_MS,
        maxRetries: 0,
      });
      const message = response.choices[0]?.message;
      const results = extractChatSearchResults(message ?? {}, limit);
      if (!results.length) throw new Error("SEARCH_EMPTY_RESULT");
      return results;
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "search execution failed";
      throw new Error(`SEARCH_PROVIDER_FAILED: ${message}`);
    }
  }
}

async function postJson<T>(url: string, body: unknown, apiKey?: string): Promise<T> {
  const response = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json", accept: "application/json", ...(apiKey ? { authorization: `Bearer ${apiKey}` } : {}) },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(PROVIDER_TIMEOUT_MS),
  });
  if (!response.ok) throw new Error(`Provider request failed: ${response.status}`);
  const contentType = response.headers.get("content-type") || "";
  if (!contentType.toLowerCase().includes("application/json")) throw new Error("PROVIDER_INVALID_CONTENT_TYPE");
  return response.json() as Promise<T>;
}

export class HttpAnalyticsProvider implements AnalyticsProvider {
  readonly name = "http-analytics";
  constructor(private readonly endpoint = process.env.ANALYTICS_PROVIDER_URL, private readonly apiKey = process.env.ANALYTICS_PROVIDER_API_KEY) {}
  async measure(request: AnalyticsRequest): Promise<AnalyticsResult> {
    if (!this.endpoint) throw new Error("ANALYTICS_PROVIDER_URL is not configured");
    const rawResult = await postJson<unknown>(normalizeProviderEndpoint(this.endpoint), request, this.apiKey);
    return validateAnalyticsResult(rawResult);
  }
}

export class HttpCommerceProvider implements CommerceProvider {
  readonly name = "http-commerce";
  constructor(private readonly endpoint = process.env.COMMERCE_PROVIDER_URL, private readonly apiKey = process.env.COMMERCE_PROVIDER_API_KEY) {}
  async listProducts(query?: string): Promise<readonly CommerceProduct[]> {
    if (!this.endpoint) throw new Error("COMMERCE_PROVIDER_URL is not configured");
    const rawProducts = await postJson<unknown>(`${normalizeProviderEndpoint(this.endpoint)}/products/search`, { query }, this.apiKey);
    return validateCommerceProducts(rawProducts);
  }
  async publishProduct(product: CommerceProduct): Promise<{ id: string; published: boolean }> {
    if (!this.endpoint) throw new Error("COMMERCE_PROVIDER_URL is not configured");
    const rawResult = await postJson<unknown>(`${normalizeProviderEndpoint(this.endpoint)}/products/publish`, product, this.apiKey);
    return validatePublishResult(rawResult);
  }
}
