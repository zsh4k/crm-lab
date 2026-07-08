// Config central leída de variables de entorno (con defaults de dev).
export const env = {
  port: Number(process.env.PORT ?? 3210),
  databaseUrl: process.env.DATABASE_URL ?? "postgresql://crm:crm_dev@localhost:5440/crm",
  appBaseUrl: process.env.APP_BASE_URL ?? "http://localhost:3210",
  encKey: process.env.CRM_ENC_KEY ?? "",
  syncPollIntervalMs: Number(process.env.SYNC_POLL_INTERVAL_MS ?? 120_000),
  google: {
    clientId: process.env.GOOGLE_CLIENT_ID ?? "",
    clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? "",
    redirectUri: process.env.GOOGLE_REDIRECT_URI ?? "http://localhost:3210/api/google/callback",
  },
  vapid: {
    publicKey: process.env.VAPID_PUBLIC_KEY ?? "",
    privateKey: process.env.VAPID_PRIVATE_KEY ?? "",
    subject: process.env.VAPID_SUBJECT ?? "mailto:hello@bunx.monster",
  },
  reminderLeadMin: Number(process.env.REMINDER_LEAD_MIN ?? 10),
};

// ¿Están configuradas las credenciales OAuth de Google?
export const googleConfigured = (): boolean =>
  Boolean(env.google.clientId && env.google.clientSecret && env.google.redirectUri);

export const pushConfigured = (): boolean => Boolean(env.vapid.publicKey && env.vapid.privateKey);
