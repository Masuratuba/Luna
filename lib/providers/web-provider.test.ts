import assert from "node:assert/strict";
import test from "node:test";
import { HttpWebFetchProvider } from "./web-provider";

test("web fetch rejects private and credential-bearing URLs before network access", async () => {
  const provider = new HttpWebFetchProvider();
  await assert.rejects(() => provider.fetch({ url: "http://127.0.0.1/admin" }), /WEB_PRIVATE_HOST_BLOCKED/);
  await assert.rejects(() => provider.fetch({ url: "http://user:pass@example.com/" }), /WEB_CREDENTIALS_IN_URL/);
  await assert.rejects(() => provider.fetch({ url: "file:///etc/passwd" }), /WEB_INVALID_URL/);
});

test("web fetch strips executable HTML and marks external content untrusted", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => new Response("<html><script>alert(1)</script><body>Hello <b>world</b></body></html>", { status: 200, headers: { "content-type": "text/html; charset=utf-8" } });
  try {
    const result = await new HttpWebFetchProvider().fetch({ url: "https://example.com" });
    assert.equal(result.content, "Hello world");
    assert.equal(result.untrusted, true);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("web fetch validates redirects instead of following blindly", async () => {
  const originalFetch = globalThis.fetch;
  let calls = 0;
  globalThis.fetch = async () => {
    calls += 1;
    return new Response(null, { status: 302, headers: { location: "http://127.0.0.1/internal" } });
  };
  try {
    await assert.rejects(() => new HttpWebFetchProvider().fetch({ url: "https://example.com" }), /WEB_PRIVATE_HOST_BLOCKED/);
    assert.equal(calls, 1);
  } finally {
    globalThis.fetch = originalFetch;
  }
});
