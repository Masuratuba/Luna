export type ParsedTaskInput = { title: string; description: string };

const QUOTED_VALUE = /[„“"](.+?)[“”"]/;

function cleanValue(value: string) {
  return value.trim().replace(/[.!?]+$/, "").trim();
}

export function parseTaskInput(message: string): ParsedTaskInput {
  const input = message.trim();
  const titleMatch = input.match(/(?:mit\s+dem\s+Titel|Titel)\s+[„“"](.+?)[“”"]/i);
  const descriptionMatch = input.match(/Beschreibung\s+(?:soll|sollte|ist|lautet)\s+(?:lauten\s+)?[„“"](.+?)[“”"]/i);
  const descriptionFallback = input.match(/Beschreibung\s+(?:soll|sollte|ist|lautet)\s+(?:lauten\s+)?(.+?)(?:[.!?]|$)/i);

  let title = titleMatch?.[1] ?? input
    .replace(/^\s*(bitte\s+)?(erstelle|erstell|mach|lege|setze)\s+(mir\s+)?(eine?\s+)?(aufgabe|task)\s*[:,-]?\s*/i, "")
    .split(/\b(?:die\s+)?Beschreibung\s+(?:soll|sollte|ist|lautet)\b/i)[0]
    .trim();

  title = cleanValue(title.replace(/^mit\s+dem\s+Titel\s+/i, "").replace(/^[:,-]\s*/, "").replace(/^([„“"])(.*)$/, "$2").replace(/[“”"]$/, ""));
  const description = cleanValue(descriptionMatch?.[1] ?? descriptionFallback?.[1] ?? "");

  if (!title) title = cleanValue(input).slice(0, 200);
  return { title: title.slice(0, 200), description: description.slice(0, 2_000) };
}
