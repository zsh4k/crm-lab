import { test, expect } from "bun:test";
import { toGoogle, fromGoogle } from "../src/server/google/sync";

test("toGoogle: evento con hora usa dateTime", () => {
  const g = toGoogle({
    title: "Reunión",
    description: "x",
    location: "Zoom",
    startAt: new Date("2026-05-26T15:00:00.000Z"),
    endAt: new Date("2026-05-26T16:00:00.000Z"),
    allDay: false,
  });
  expect(g.summary).toBe("Reunión");
  expect(g.start?.dateTime).toBe("2026-05-26T15:00:00.000Z");
  expect(g.start?.date).toBeUndefined();
});

test("toGoogle: evento all-day usa date", () => {
  const g = toGoogle({
    title: "Feriado",
    description: null,
    location: null,
    startAt: new Date("2026-05-26T00:00:00.000Z"),
    endAt: new Date("2026-05-27T00:00:00.000Z"),
    allDay: true,
  });
  expect(g.start?.date).toBe("2026-05-26");
  expect(g.start?.dateTime).toBeUndefined();
});

test("fromGoogle: dateTime → no all-day", () => {
  const ev = fromGoogle({ id: "g1", summary: "Call", start: { dateTime: "2026-05-26T15:00:00Z" }, end: { dateTime: "2026-05-26T16:00:00Z" } });
  expect(ev.allDay).toBe(false);
  expect(ev.title).toBe("Call");
  expect(ev.startAt.toISOString()).toBe("2026-05-26T15:00:00.000Z");
});

test("fromGoogle: date → all-day + título por defecto", () => {
  const ev = fromGoogle({ id: "g2", start: { date: "2026-05-26" }, end: { date: "2026-05-27" } });
  expect(ev.allDay).toBe(true);
  expect(ev.title).toBe("(sin título)");
});
