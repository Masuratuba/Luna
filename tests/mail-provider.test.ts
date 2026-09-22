import test from "node:test";
import assert from "node:assert/strict";
import { MicrosoftGraphMailProvider } from "../lib/providers/mail";

const originalFetch = globalThis.fetch;

test.afterEach(() => {
  globalThis.fetch = originalFetch;
});

function response(body: unknown, status = 200, headers: Record<string, string> = { "content-type": "application/json" }): Response {
  return new Response(body === undefined ? null : JSON.stringify(body), { status, headers });
}

test("mail search validates query and folder before calling Graph", async () => {
  const provider = new MicrosoftGraphMailProvider("token");
  await assert.rejects(() => provider.search({ query: "   " }), /MAIL_QUERY_REQUIRED/);
  await assert.rejects(() => provider.search({ query: "hello", folder: "archive" as never }), /MAIL_FOLDER_INVALID/);
});

test("mail search sends bounded Graph parameters and maps messages", async () => {
  let requestedUrl = "";
  let requestedHeaders: Headers | undefined;
  globalThis.fetch = async (input, init) => {
    requestedUrl = String(input);
    requestedHeaders = new Headers(init?.headers);
    return response({ value: [{ id: "m1", subject: "Hello", from: { emailAddress: { address: "from@example.com" } }, toRecipients: [{ emailAddress: { address: "to@example.com" } }], isRead: true }] });
  };

  const provider = new MicrosoftGraphMailProvider("token");
  const messages = await provider.search({ query: 'hello "quoted"', limit: 999, folder: "sent" });

  const url = new URL(requestedUrl);
  assert.equal(url.pathname, "/v1.0/me/mailFolders/sent/messages");
  assert.equal(url.searchParams.get("$top"), "20");
  assert.match(url.searchParams.get("$search") ?? "", /quoted/);
  assert.equal(requestedHeaders?.get("authorization"), "Bearer token");
  assert.equal(requestedHeaders?.get("consistencylevel"), "eventual");
  assert.deepEqual(messages[0], { id: "m1", subject: "Hello", from: "from@example.com", to: ["to@example.com"], receivedAt: undefined, bodyPreview: undefined, isRead: true });
});

test("mail read encodes the message id and rejects malformed Graph data", async () => {
  let requestedUrl = "";
  globalThis.fetch = async (input) => {
    requestedUrl = String(input);
    return response({ id: "m/1", subject: "Read me", toRecipients: [] });
  };

  const provider = new MicrosoftGraphMailProvider("token");
  const message = await provider.read({ id: "m/1" });
  assert.match(requestedUrl, /m%2F1/);
  assert.equal(message.subject, "Read me");

  globalThis.fetch = async () => response({ id: "missing-subject" });
  await assert.rejects(() => provider.read({ id: "missing-subject" }), /MAIL_INVALID_RESPONSE/);
  await assert.rejects(() => provider.read({ id: "   " }), /MAIL_ID_REQUIRED/);
});

test("mail send validates required fields and creates the expected Graph payload", async () => {
  let requestedInit: RequestInit | undefined;
  globalThis.fetch = async (_input, init) => {
    requestedInit = init;
    return response(undefined, 202, {});
  };

  const provider = new MicrosoftGraphMailProvider("token");
  const result = await provider.send({ to: [" to@example.com ", ""], cc: ["cc@example.com"], subject: " Subject ", body: " Body " });
  assert.equal(result.sent, true);
  assert.match(result.id, /.+/);
  const payload = JSON.parse(String(requestedInit?.body));
  assert.equal(payload.saveToSentItems, true);
  assert.equal(payload.message.subject, "Subject");
  assert.equal(payload.message.body.content, "Body");
  assert.deepEqual(payload.message.toRecipients, [{ emailAddress: { address: "to@example.com" } }]);
  assert.deepEqual(payload.message.ccRecipients, [{ emailAddress: { address: "cc@example.com" } }]);

  await assert.rejects(() => provider.send({ to: [], subject: "Subject", body: "Body" }), /MAIL_RECIPIENT_REQUIRED/);
  await assert.rejects(() => provider.send({ to: ["to@example.com"], subject: "", body: "Body" }), /MAIL_SUBJECT_REQUIRED/);
  await assert.rejects(() => provider.send({ to: ["to@example.com"], subject: "Subject", body: "" }), /MAIL_BODY_REQUIRED/);
});

test("mail provider maps authorization, HTTP, content-type, and timeout failures", async () => {
  const provider = new MicrosoftGraphMailProvider("token");
  globalThis.fetch = async () => response({}, 403);
  await assert.rejects(() => provider.read({ id: "m1" }), /MAIL_PROVIDER_UNAUTHORIZED/);

  globalThis.fetch = async () => response({}, 429);
  await assert.rejects(() => provider.read({ id: "m1" }), /MAIL_PROVIDER_HTTP_429/);

  globalThis.fetch = async () => response("not-json", 200, { "content-type": "text/plain" });
  await assert.rejects(() => provider.read({ id: "m1" }), /MAIL_PROVIDER_INVALID_CONTENT_TYPE/);

  globalThis.fetch = async () => { throw new DOMException("timed out", "TimeoutError"); };
  await assert.rejects(() => provider.read({ id: "m1" }), /MAIL_PROVIDER_TIMEOUT/);
});

test("mail provider requires an access token", async () => {
  const provider = new MicrosoftGraphMailProvider("   ");
  await assert.rejects(() => provider.read({ id: "m1" }), /MICROSOFT_GRAPH_ACCESS_TOKEN is not configured/);
});
