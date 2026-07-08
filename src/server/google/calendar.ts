// Cliente mínimo de la Google Calendar API v3 (REST con fetch).
// Cubre lo que necesita el sync: list incremental (syncToken) + insert/update/delete.

const BASE = "https://www.googleapis.com/calendar/v3";

export interface GCalDate {
  date?: string; // all-day: YYYY-MM-DD
  dateTime?: string; // RFC3339
  timeZone?: string;
}

export interface GCalEvent {
  id?: string;
  status?: "confirmed" | "tentative" | "cancelled";
  summary?: string;
  description?: string;
  location?: string;
  start?: GCalDate;
  end?: GCalDate;
  updated?: string;
  etag?: string;
}

export interface ListResult {
  items: GCalEvent[];
  nextPageToken?: string;
  nextSyncToken?: string;
  /** 410 = syncToken inválido → hay que hacer full resync. */
  gone: boolean;
}

function cal(calendarId: string): string {
  return `${BASE}/calendars/${encodeURIComponent(calendarId)}/events`;
}

export async function listEvents(
  token: string,
  calendarId: string,
  opts: { syncToken?: string; pageToken?: string; timeMin?: string } = {},
): Promise<ListResult> {
  const p = new URLSearchParams({ singleEvents: "true", showDeleted: "true", maxResults: "250" });
  if (opts.syncToken) p.set("syncToken", opts.syncToken);
  else if (opts.timeMin) p.set("timeMin", opts.timeMin);
  if (opts.pageToken) p.set("pageToken", opts.pageToken);

  const res = await fetch(`${cal(calendarId)}?${p.toString()}`, {
    headers: { authorization: `Bearer ${token}` },
  });
  if (res.status === 410) return { items: [], gone: true };
  if (!res.ok) throw new Error(`listEvents ${res.status}: ${await res.text()}`);
  const d = (await res.json()) as { items?: GCalEvent[]; nextPageToken?: string; nextSyncToken?: string };
  return { items: d.items ?? [], nextPageToken: d.nextPageToken, nextSyncToken: d.nextSyncToken, gone: false };
}

export async function insertEvent(token: string, calendarId: string, ev: GCalEvent): Promise<GCalEvent> {
  const res = await fetch(cal(calendarId), {
    method: "POST",
    headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
    body: JSON.stringify(ev),
  });
  if (!res.ok) throw new Error(`insertEvent ${res.status}: ${await res.text()}`);
  return (await res.json()) as GCalEvent;
}

export async function updateEvent(
  token: string,
  calendarId: string,
  eventId: string,
  ev: GCalEvent,
): Promise<GCalEvent> {
  const res = await fetch(`${cal(calendarId)}/${encodeURIComponent(eventId)}`, {
    method: "PUT",
    headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
    body: JSON.stringify(ev),
  });
  if (!res.ok) throw new Error(`updateEvent ${res.status}: ${await res.text()}`);
  return (await res.json()) as GCalEvent;
}

export async function deleteEvent(token: string, calendarId: string, eventId: string): Promise<void> {
  const res = await fetch(`${cal(calendarId)}/${encodeURIComponent(eventId)}`, {
    method: "DELETE",
    headers: { authorization: `Bearer ${token}` },
  });
  // 410/404 = ya no existe en Google → idempotente, lo tratamos como éxito.
  if (!res.ok && res.status !== 410 && res.status !== 404) {
    throw new Error(`deleteEvent ${res.status}: ${await res.text()}`);
  }
}
