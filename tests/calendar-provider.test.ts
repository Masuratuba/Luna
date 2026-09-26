import test from "node:test";
import assert from "node:assert/strict";
import { MicrosoftGraphCalendarProvider } from "../lib/providers/calendar";

const originalFetch = globalThis.fetch;

test.afterEach(() => {
  globalThis.fetch = originalFetch;
});

function response(body: unknown, status = 200, headers: Record<string, string> = { "content-type": "application/json" }): Response {
  return new Response(body === undefined ? null : JSON.stringify(body), { status, headers });
}

const event = {
  id: "e1",
  subject: "Meeting",
  start: { dateTime: "2026-09-22T10:00:00", timeZone: "UTC" },
  end: { dateTime: "2026-09-22T11:00:00", timeZone: "UTC" },
  location: { displayName: "Office" },
  bodyPreview: "Discuss project",
  organizer: { emailAddress: { address: "organizer@example.com" } },
  attendees: [{ emailAddress: { address: "guest@example.com" } }],
};

test("calendar list validates date range and sends bounded Graph parameters", async () => {
  let requestedUrl = "";
  let requestedHeaders: Headers | undefined;
  globalThis.fetch = async (input, init) => {
    requestedUrl = String(input);
    requestedHeaders = new Headers(init?.headers);
    return response({ value: [event] });
  };

  const provider = new MicrosoftGraphCalendarProvider("token");
  await assert.rejects(() => provider.list({ startDateTime: "2026-09-23T10:00:00Z", endDateTime: "2026-09-22T10:00:00Z" }), /CALENDAR_RANGE_INVALID/);
  const events = await provider.list({ startDateTime: "2026-09-22T00:00:00Z", endDateTime: "2026-09-23T00:00:00Z", limit: 999 });
  const url = new URL(requestedUrl);
  assert.equal(url.pathname, "/v1.0/me/calendarView");
  assert.equal(url.searchParams.get("$top"), "50");
  assert.equal(requestedHeaders?.get("authorization"), "Bearer token");
  assert.equal(requestedHeaders?.get("prefer"), 'outlook.timezone="UTC"');
  assert.deepEqual(events[0], { id: "e1", subject: "Meeting", start: "2026-09-22T10:00:00", end: "2026-09-22T11:00:00", timeZone: "UTC", location: "Office", bodyPreview: "Discuss project", organizer: "organizer@example.com", attendees: ["guest@example.com"] });
});

test("calendar create sends normalized Graph payload and validates required fields", async () => {
  let requestedInit: RequestInit | undefined;
  globalThis.fetch = async (_input, init) => {
    requestedInit = init;
    return response(event);
  };

  const provider = new MicrosoftGraphCalendarProvider("token");
  const created = await provider.create({ subject: " Meeting ", start: "2026-09-22T10:00:00Z", end: "2026-09-22T11:00:00Z", location: " Office ", body: " Discuss ", attendees: ["guest@example.com"] });
  assert.equal(created.id, "e1");
  const payload = JSON.parse(String(requestedInit?.body));
  assert.equal(payload.subject, "Meeting");
  assert.equal(payload.location.displayName, "Office");
  assert.equal(payload.body.content, "Discuss");
  assert.deepEqual(payload.attendees, [{ emailAddress: { address: "guest@example.com" }, type: "required" }]);
  await assert.rejects(() => provider.create({ subject: "", start: "2026-09-22T10:00:00Z", end: "2026-09-22T11:00:00Z" }), /CALENDAR_SUBJECT_REQUIRED/);
  await assert.rejects(() => provider.create({ subject: "Meeting", start: "2026-09-22T11:00:00Z", end: "2026-09-22T10:00:00Z" }), /CALENDAR_RANGE_INVALID/);
});

test("calendar read and delete encode ids and return mapped results", async () => {
  const requestedUrls: string[] = [];
  globalThis.fetch = async (input, init) => {
    requestedUrls.push(String(input));
    return init?.method === "DELETE" ? response(undefined, 204) : response(event);
  };

  const provider = new MicrosoftGraphCalendarProvider("token");
  const read = await provider.read("e/1");
  const deleted = await provider.delete("e/1");
  assert.equal(read.subject, "Meeting");
  assert.deepEqual(deleted, { id: "e/1", deleted: true });
  assert.match(requestedUrls[0], /e%2F1/);
  assert.match(requestedUrls[1], /e%2F1/);
  await assert.rejects(() => provider.read("   "), /CALENDAR_ID_REQUIRED/);
});

test("calendar update validates fields and sends PATCH payload", async () => {
  let requestedInit: RequestInit | undefined;
  globalThis.fetch = async (_input, init) => {
    requestedInit = init;
    return response(event);
  };

  const provider = new MicrosoftGraphCalendarProvider("token");
  await provider.update({ id: "e1", subject: " Updated ", start: "2026-09-22T12:00:00Z", end: "2026-09-22T13:00:00Z", body: " New body " });
  assert.equal(requestedInit?.method, "PATCH");
  const payload = JSON.parse(String(requestedInit?.body));
  assert.equal(payload.subject, "Updated");
  assert.equal(payload.start.dateTime, "2026-09-22T12:00:00Z");
  assert.equal(payload.end.dateTime, "2026-09-22T13:00:00Z");
  assert.equal(payload.body.content, "New body");
  await assert.rejects(() => provider.update({ id: "e1", subject: "" }), /CALENDAR_SUBJECT_REQUIRED/);
  await assert.rejects(() => provider.update({ id: "e1", start: "not-a-date" }), /CALENDAR_START_INVALID/);
  await assert.rejects(() => provider.update({ id: "e1", start: "2026-09-22T14:00:00Z", end: "2026-09-22T13:00:00Z" }), /CALENDAR_RANGE_INVALID/);
});

test("calendar provider maps authorization, HTTP, content-type, and timeout failures", async () => {
  const provider = new MicrosoftGraphCalendarProvider("token");
  globalThis.fetch = async () => response({}, 403);
  await assert.rejects(() => provider.read("e1"), /CALENDAR_PROVIDER_UNAUTHORIZED/);
  globalThis.fetch = async () => response({}, 429);
  await assert.rejects(() => provider.read("e1"), /CALENDAR_PROVIDER_HTTP_429/);
  globalThis.fetch = async () => response("not-json", 200, { "content-type": "text/plain" });
  await assert.rejects(() => provider.read("e1"), /CALENDAR_PROVIDER_INVALID_CONTENT_TYPE/);
  globalThis.fetch = async () => { throw new DOMException("timed out", "TimeoutError"); };
  await assert.rejects(() => provider.read("e1"), /CALENDAR_PROVIDER_TIMEOUT/);
});
test("calendar provider rejects missing access tokens before calling Graph", async () => {
  let fetchCalled = false;
  globalThis.fetch = async () => {
    fetchCalled = true;
    return response(event);
  };

  const provider = new MicrosoftGraphCalendarProvider("   ");
  await assert.rejects(() => provider.read("e1"), /MICROSOFT_GRAPH_ACCESS_TOKEN is not configured/);
  assert.equal(fetchCalled, false);
});
