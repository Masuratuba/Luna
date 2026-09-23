import test from "node:test";
import assert from "node:assert/strict";
import { calendarInputError } from "../lib/providers/calendar-route-errors";

test("calendar route maps known provider input errors", () => {
  assert.equal(calendarInputError("CALENDAR_ID_REQUIRED"), "event id is required");
  assert.equal(calendarInputError("CALENDAR_SUBJECT_REQUIRED"), "subject is required");
  assert.equal(calendarInputError("CALENDAR_START_INVALID"), "start must be a valid date");
  assert.equal(calendarInputError("CALENDAR_END_INVALID"), "end must be a valid date");
  assert.equal(calendarInputError("CALENDAR_RANGE_INVALID"), "end must be later than start");
  assert.equal(calendarInputError("UNKNOWN_ERROR"), undefined);
});
