import { eq } from "drizzle-orm";
import { db } from "../db/client";
import { googleAccounts } from "../db/schema";
import { decrypt, encrypt } from "../lib/crypto";
import { refreshAccessToken } from "./oauth";

type Account = typeof googleAccounts.$inferSelect;

// Devuelve un access_token válido para la cuenta, renovándolo con el
// refresh_token si está vencido (margen de 60s) y persistiendo el nuevo.
// Esta es la pieza que hace que el login sea "una sola vez".
export async function getValidAccessToken(account: Account): Promise<string> {
  const margin = 60_000;
  const stillValid =
    account.accessTokenEnc &&
    account.tokenExpiry &&
    account.tokenExpiry.getTime() - margin > Date.now();

  if (stillValid) return decrypt(account.accessTokenEnc!);

  const refreshToken = decrypt(account.refreshTokenEnc);
  const tok = await refreshAccessToken(refreshToken);
  const expiry = new Date(Date.now() + tok.expires_in * 1000);

  await db
    .update(googleAccounts)
    .set({
      accessTokenEnc: encrypt(tok.access_token),
      tokenExpiry: expiry,
      updatedAt: new Date(),
    })
    .where(eq(googleAccounts.id, account.id));

  return tok.access_token;
}
