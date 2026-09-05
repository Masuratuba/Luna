import test from "node:test";
import assert from "node:assert/strict";
import { MicrosoftGraphMailProvider } from "./mail";

function response(body: unknown, status = 200): Response { return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } }); }

test("mail search rejects an empty query before network access", async () => { await assert.rejects(() => new MicrosoftGraphMailProvider("token").search({ query: "   " }), /MAIL_QUERY_REQUIRED/); });

test("mail read maps Microsoft Graph message fields", async () => {
  const original = globalThis.fetch;
  globalThis.fetch = async () => response({ id: "m1", subject: "Hello", from: { emailAddress: { address: "a@example.com" } }, toRecipients: [{ emailAddress: { address: "b@example.com" } }], receivedDateTime: "2026-09-05T10:00:00Z", bodyPreview: "Preview", isRead: false });
  try { const message = await new MicrosoftGraphMailProvider("token").read({ id: "m1" }); assert.equal(message.id, "m1"); assert.equal(message.from, "a@example.com"); assert.deepEqual(message.to, ["b@example.com"]); }
  finally { globalThis.fetch = original; }
});

test("mail send accepts Graph 202 Accepted with an empty body", async () => {
  const original = globalThis.fetch; let called = false;
  globalThis.fetch = async (_url, init) => { called = true; assert.equal(init?.method, "POST"); assert.match(String(init?.body), /Hello/); return new Response(null, { status: 202 }); };
  try { const result = await new MicrosoftGraphMailProvider("token").send({ to: ["b@example.com"], subject: "Hello", body: "Hello" }); assert.equal(result.sent, true); assert.equal(called, true); }
  finally { globalThis.fetch = original; }
});

test("mail provider fails closed without an access token", async () => { await assert.rejects(() => new MicrosoftGraphMailProvider("").read({ id: "m1" }), /MICROSOFT_GRAPH_ACCESS_TOKEN/); });
