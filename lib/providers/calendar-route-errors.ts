const CALENDAR_INPUT_ERRORS: Record<string, string> = {
  CALENDAR_ID_REQUIRED: "event id is required",
  CALENDAR_SUBJECT_REQUIRED: "subject is required",
  CALENDAR_START_INVALID: "start must be a valid date",
  CALENDAR_END_INVALID: "end must be a valid date",
  CALENDAR_RANGE_INVALID: "end must be later than start",
};

export function calendarInputError(message: string): string | undefined {
  return CALENDAR_INPUT_ERRORS[message];
}
