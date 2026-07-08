import { env } from "../lib/env";

// Flujo OAuth2 de Google implementado con fetch puro (sin el SDK pesado
// googleapis). El objetivo es "autenticarse una vez": pedimos access_type=offline
// + prompt=consent para garantizar que Google nos devuelva un refresh_token,
// que guardamos cifrado y nos permite renovar el access_token indefinidamente.

const AUTH_ENDPOINT = "https://accounts.google.com/o/oauth2/v2/auth";
const TOKEN_ENDPOINT = "https://oauth2.googleapis.com/token";
const USERINFO_ENDPOINT = "https://www.googleapis.com/oauth2/v2/userinfo";
const REVOKE_ENDPOINT = "https://oauth2.googleapis.com/revoke";

export const SCOPES = [
  "https://www.googleapis.com/auth/calendar",
  "https://www.googleapis.com/auth/userinfo.email",
  "openid",
];

export interface TokenResponse {
  access_token: string;
  expires_in: number;
  refresh_token?: string;
  scope: string;
  token_type: string;
  id_token?: string;
}

// URL a la que mandamos al usuario para que autorice. `state` previene CSRF.
export function buildAuthUrl(state: string): string {
  const params = new URLSearchParams({
    client_id: env.google.clientId,
    redirect_uri: env.google.redirectUri,
    response_type: "code",
    scope: SCOPES.join(" "),
    access_type: "offline", // exige refresh_token
    prompt: "consent", // fuerza a Google a re-emitir refresh_token
    include_granted_scopes: "true",
    state,
  });
  return `${AUTH_ENDPOINT}?${params.toString()}`;
}

// Intercambia el `code` del callback por tokens (incluye refresh_token).
export async function exchangeCode(code: string): Promise<TokenResponse> {
  const res = await fetch(TOKEN_ENDPOINT, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: env.google.clientId,
      client_secret: env.google.clientSecret,
      redirect_uri: env.google.redirectUri,
      grant_type: "authorization_code",
    }),
  });
  if (!res.ok) throw new Error(`exchangeCode falló: ${res.status} ${await res.text()}`);
  return (await res.json()) as TokenResponse;
}

// Renueva el access_token a partir del refresh_token (la magia del "una vez").
export async function refreshAccessToken(refreshToken: string): Promise<TokenResponse> {
  const res = await fetch(TOKEN_ENDPOINT, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      refresh_token: refreshToken,
      client_id: env.google.clientId,
      client_secret: env.google.clientSecret,
      grant_type: "refresh_token",
    }),
  });
  if (!res.ok) throw new Error(`refreshAccessToken falló: ${res.status} ${await res.text()}`);
  return (await res.json()) as TokenResponse;
}

// Email de la cuenta autorizada — sirve de identificador legible.
export async function fetchUserEmail(accessToken: string): Promise<string> {
  const res = await fetch(USERINFO_ENDPOINT, {
    headers: { authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) throw new Error(`fetchUserEmail falló: ${res.status}`);
  const data = (await res.json()) as { email?: string };
  return data.email ?? "desconocido@google";
}

// Revoca el acceso al desconectar la cuenta.
export async function revokeToken(token: string): Promise<void> {
  await fetch(REVOKE_ENDPOINT, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ token }),
  }).catch(() => {});
}
