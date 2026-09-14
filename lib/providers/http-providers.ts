import type { AnalyticsProvider, AnalyticsRequest, AnalyticsResult, CommerceProduct, CommerceProvider, SearchProvider, SearchRequest, SearchResult } from "./contracts";
import { getOpenAI } from "../openai";
import { validateAnalyticsResult } from "./analytics-validation";
import { validateCommerceProducts, validatePublishResult } from "./commerce-validation";

// Web search can legitimately take longer than an ordinary API request because the model
// performs external retrieval before returning its answer. Keep a bounded but realistic timeout.
const PROVIDER_TIMEOUT_MS = 45_000;
const DEFAULT_SEARCH_LIMIT = 5;
const MAX_SEARCH_LIMIT = 10;

type WebCitation = Readonly<{ url?: unknown; title?: unknown }>;
type SearchOutput = Readonly<{ output_text?: unknown; output?: unknown }>;

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

  // A successful web-search response without exposed source metadata is still a successful
  // research result. The route can pass the researched text to LUNA rather than reporting failure.
  if (text) return [{ title: "OpenAI Web-Recherche", snippet: text }];
  return results;
}

function hasWebSearchCall(response: SearchOutput): boolean {
  return Array.isArray(response.output) && response.output.some((item) => item && typeof item === "object" && "type" in item && item.type === "web_search_call");
}

export class HttpSearchProvider implements SearchProvider {
  readonly name = "openai-web-search";

  async search(request: SearchRequest): Promise<readonly SearchResult[]> {
    const query = request.query.trim();
    if (!query) throw new Error("SEARCH_QUERY_REQUIRED");
    const requestedLimit = Number.isFinite(request.limit) ? Math.floor(request.limit as number) : DEFAULT_SEARCH_LIMIT;
    const limit = Math.min(MAX_SEARCH_LIMIT, Math.max(1, requestedLimit));
    const model = process.env.OPENAI_SEARCH_MODEL?.trim() || "gpt-5.6-luna";
    const input = `You are LUNA's live research engine. You MUST use the web search tool before answering. Do not answer from general knowledge. Search current web sources and use the retrieved information. For travel requests, search actual current transport providers and booking/search pages for the requested date, route, transport modes and prices where available. Prefer official provider sources. Distinguish exact current fares from estimates. Return researched findings with source URLs when available.\n\nUser request: ${query}`;

    try {
      // Use the current documented Responses API web-search pattern. The search tool is the
      // only available tool, and the instruction explicitly requires using it; this avoids
      // the unreliable `tool_choice: required` path that can hang/fail for hosted search.
      const response = await getOpenAI().responses.create({
        model,
        input,
        tools: [{ type: "web_search", search_context_size: "high" }],
        tool_choice: "auto",
        include: ["web_search_call.action.sources"],
        store: false,
      });

      if (!hasWebSearchCall(response)) throw new Error("SEARCH_TOOL_NOT_USED");
      return extractSearchResults(response, limit);
    } catch (error: unknown) {
      // Retry once without optional source expansion. A search call with usable output is still
      // valid even when source metadata cannot be expanded by the installed SDK/API combination.
      try {
        const response = await getOpenAI().responses.create({
          model,
          input,
          tools: [{ type: "web_search", search_context_size: "high" }],
          tool_choice: "auto",
          store: false,
        });
        if (!hasWebSearchCall(response)) throw new Error("SEARCH_TOOL_NOT_USED");
        return extractSearchResults(response, limit);
      } catch (retryError: unknown) {
        const message = retryError instanceof Error ? retryError.message : "search execution failed";
        throw new Error(`SEARCH_PROVIDER_FAILED: ${message}`);
      }
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
