import { test, expect } from "bun:test";
import { buildAuthUrl, SCOPES } from "../src/server/google/oauth";

test("authorize URL exige offline + consent (garantiza refresh_token)", () => {
  const u = new URL(buildAuthUrl("estado-123"));
  expect(u.origin + u.pathname).toBe("https://accounts.google.com/o/oauth2/v2/auth");
  expect(u.searchParams.get("access_type")).toBe("offline");
  expect(u.searchParams.get("prompt")).toBe("consent");
  expect(u.searchParams.get("response_type")).toBe("code");
  expect(u.searchParams.get("state")).toBe("estado-123");
});

test("authorize URL incluye el scope de calendar", () => {
  const u = new URL(buildAuthUrl("s"));
  const scope = u.searchParams.get("scope") ?? "";
  for (const s of SCOPES) expect(scope).toContain(s);
  expect(scope).toContain("auth/calendar");
});
