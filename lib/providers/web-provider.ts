import type { WebFetchProvider, WebFetchRequest, WebFetchResult } from "./contracts";

const TIMEOUT_MS = 15_000;
const MAX_BYTES = 1_000_000;
const MAX_REDIRECTS = 3;

function isBlockedHostname(hostname: string): boolean {
  const host = hostname.toLowerCase().replace(/^\[|\]$/g, "");
  if (host === "localhost" || host.endsWith(".localhost") || host.endsWith(".local") || host === "metadata.google.internal") return true;
  if (host === "::1" || host === "0.0.0.0") return true;
  const parts = host.split(".").map(Number);
  if (parts.length === 4 && parts.every((part) => Number.isInteger(part) && part >= 0 && part <= 255)) {
    const [a, b] = parts;
    if (a === 10 || a === 127 || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168)) return true;
  }
  return false;
}

function validateUrl(raw: string): URL {
  const url = new URL(raw);
  if (url.protocol !== "https:" && url.protocol !== "http:") throw new Error("WEB_INVALID_URL");
  if (url.username || url.password) throw new Error("WEB_CREDENTIALS_IN_URL");
  if (isBlockedHostname(url.hostname)) throw new Error("WEB_PRIVATE_HOST_BLOCKED");
  return url;
}

function stripHtml(html: string): string {
  return html
    .replace(/<script[\\s\\S]*?<\\/script>/gi, " ")
    .replace(/<style[\\s\\S]*?<\\/style>/gi, " ")
    .replace(/<noscript[\\s\\S]*?<\\/noscript>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/\\s+/g, " ")
    .trim();
}

async function readBody(response: Response): Promise<string> {
  const reader = response.body?.getReader();
  if (!reader) return response.text();
  const chunks: Uint8Array[] = [];
  let total = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > MAX_BYTES) {
      await reader.cancel();
      throw new Error("WEB_RESPONSE_TOO_LARGE");
    }
    chunks.push(value);
  }
  const bytes = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
  return new TextDecoder().decode(bytes);
}

export class HttpWebFetchProvider implements WebFetchProvider {
  readonly name = "http-web-fetch";

  async fetch(request: WebFetchRequest): Promise<WebFetchResult> {
    let url = validateUrl(request.url.trim());
    for (let redirects = 0; redirects <= MAX_REDIRECTS; redirects += 1) {
      const response = await globalThis.fetch(url, {
        method: "GET",
        redirect: "manual",
        headers: { accept: "text/html, text/plain, application/json;q=0.9, */*;q=0.1" },
        signal: AbortSignal.timeout(TIMEOUT_MS),
      });
      if (response.status >= 300 && response.status < 400) {
        const location = response.headers.get("location");
        if (!location || redirects === MAX_REDIRECTS) throw new Error("WEB_REDIRECT_LIMIT");
        url = validateUrl(new URL(location, url).toString());
        continue;
      }
      if (!response.ok) throw new Error(`WEB_REQUEST_FAILED:${response.status}`);
      const contentType = (response.headers.get("content-type") || "").toLowerCase();
      if (!contentType.includes("text/html") && !contentType.includes("text/plain") && !contentType.includes("application/json")) {
        throw new Error("WEB_UNSUPPORTED_CONTENT_TYPE");
      }
      const raw = await readBody(response);
      const content = contentType.includes("text/html") ? stripHtml(raw) : raw.trim();
      return { url: url.toString(), content: content.slice(0, 50_000), truncated: content.length > 50_000, untrusted: true };
    }
    throw new Error("WEB_REDIRECT_LIMIT");
  }
}
