import { NextResponse } from "next/server";
import { requireUser } from "../../../../../lib/supabase/auth";
import { getMicrosoftGraphAccessToken } from "../../../../../lib/integrations/microsoft";

type GraphMessage = {
  id: string;
  subject?: string;
  from?: { emailAddress?: { name?: string; address?: string } };
  receivedDateTime?: string;
  bodyPreview?: string;
  isRead?: boolean;
};

type GraphEvent = {
  id: string;
  subject?: string;
  start?: { dateTime?: string; timeZone?: string };
  end?: { dateTime?: string; timeZone?: string };
  location?: { displayName?: string };
  isAllDay?: boolean;
  webLink?: string;
};

async function graphGet<T>(path: string, accessToken: string): Promise<T> {
  const response = await fetch(`https://graph.microsoft.com/v1.0${path}`, {
    headers: { accept: "application/json", authorization: `Bearer ${accessToken}` },
    cache: "no-store",
    signal: AbortSignal.timeout(15_000),
  });
  if (!response.ok) throw new Error(`MICROSOFT_GRAPH_HTTP_${response.status}`);
  return response.json() as Promise<T>;
}

export async function GET(request: Request) {
  try {
    const { user } = await requireUser(request);
    const accessToken = await getMicrosoftGraphAccessToken(user.id);
    const now = new Date();
    const week = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    const start = encodeURIComponent(now.toISOString());
    const end = encodeURIComponent(week.toISOString());

    const [messages, events] = await Promise.all([
      graphGet<{ value: GraphMessage[] }>(
        "/me/messages?$top=5&$select=id,subject,from,receivedDateTime,bodyPreview,isRead&$orderby=receivedDateTime%20desc",
        accessToken,
      ),
      graphGet<{ value: GraphEvent[] }>(
        `/me/calendarView?startDateTime=${start}&endDateTime=${end}&$top=10&$select=id,subject,start,end,location,isAllDay,webLink&$orderby=start/dateTime`,
        accessToken,
      ),
    ]);

    return NextResponse.json({
      ok: true,
      mail: messages.value.map((item) => ({
        id: item.id,
        subject: item.subject || "(Ohne Betreff)",
        sender: item.from?.emailAddress?.name || item.from?.emailAddress?.address || "Unbekannt",
        receivedAt: item.receivedDateTime ?? null,
        preview: item.bodyPreview ?? "",
        isRead: item.isRead ?? false,
      })),
      events: events.value.map((item) => ({
        id: item.id,
        subject: item.subject || "(Ohne Titel)",
        start: item.start?.dateTime ?? null,
        end: item.end?.dateTime ?? null,
        timeZone: item.start?.timeZone ?? "UTC",
        location: item.location?.displayName ?? null,
        allDay: item.isAllDay ?? false,
        webLink: item.webLink ?? null,
      })),
    });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Anmeldung erforderlich." }, { status: 401 });
    }
    if (error instanceof Error && error.message === "MICROSOFT_NOT_CONNECTED") {
      return NextResponse.json({ error: "Microsoft ist noch nicht verbunden." }, { status: 409 });
    }
    console.error("Microsoft mail and calendar load error", error);
    return NextResponse.json({ error: "Outlook-Daten konnten nicht geladen werden." }, { status: 502 });
  }
}
