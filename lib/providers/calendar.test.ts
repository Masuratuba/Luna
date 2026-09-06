import test from "node:test";
import assert from "node:assert/strict";
import { MicrosoftGraphCalendarProvider } from "./calendar";
function response(body: unknown, status = 200): Response { return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } }); }

test("calendar list rejects an invalid range before network access", async () => { await assert.rejects(() => new MicrosoftGraphCalendarProvider("token").list({ startDateTime: "2026-09-07T12:00:00Z", endDateTime: "2026-09-07T11:00:00Z" }), /CALENDAR_RANGE_INVALID/); });

test("calendar read maps Graph event fields", async () => { const original = globalThis.fetch; globalThis.fetch = async () => response({ id: "e1", subject: "Meeting", start: { dateTime: "2026-09-07T10:00:00Z", timeZone: "UTC" }, end: { dateTime: "2026-09-07T11:00:00Z", timeZone: "UTC" }, location: { displayName: "Office" }, bodyPreview: "Discuss Luna", organizer: { emailAddress: { address: "a@example.com" } }, attendees: [{ emailAddress: { address: "b@example.com" } }] }); try { const event = await new MicrosoftGraphCalendarProvider("token").read("e1"); assert.equal(event.id, "e1"); assert.equal(event.subject, "Meeting"); assert.equal(event.location, "Office"); assert.deepEqual(event.attendees, ["b@example.com"]); } finally { globalThis.fetch = original; } });

test("calendar create sends Graph event payload", async () => { const original = globalThis.fetch; let called = false; globalThis.fetch = async (_url, init) => { called = true; assert.equal(init?.method, "POST"); assert.match(String(init?.body), /Meeting/); return response({ id: "e2", subject: "Meeting", start: { dateTime: "2026-09-07T10:00:00Z", timeZone: "UTC" }, end: { dateTime: "2026-09-07T11:00:00Z", timeZone: "UTC" } }); }; try { const event = await new MicrosoftGraphCalendarProvider("token").create({ subject: "Meeting", start: "2026-09-07T10:00:00Z", end: "2026-09-07T11:00:00Z" }); assert.equal(event.id, "e2"); assert.equal(called, true); } finally { globalThis.fetch = original; } });

test("calendar provider fails closed without an access token", async () => { await assert.rejects(() => new MicrosoftGraphCalendarProvider("").read("e1"), /MICROSOFT_GRAPH_ACCESS_TOKEN/); });
