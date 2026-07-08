import { scryptSync, randomBytes, createCipheriv, createDecipheriv } from "node:crypto";
import { env } from "./env";

// Cifrado at-rest de tokens OAuth — mismo patrón que locky/nexo:
// scrypt para derivar la clave + AES-256-GCM (IV 12 bytes + authTag).
// Formato del blob: base64(salt):base64(iv):base64(tag):base64(ciphertext).

const N = 1 << 15;

function requireKey(): string {
  if (!env.encKey || env.encKey.length < 16) {
    throw new Error("CRM_ENC_KEY no configurada o demasiado corta (mín. 16 chars).");
  }
  return env.encKey;
}

function deriveKey(salt: Buffer): Buffer {
  return scryptSync(requireKey(), salt, 32, { N, r: 8, p: 1, maxmem: 128 * 1024 * 1024 });
}

export function encrypt(plain: string): string {
  const salt = randomBytes(16);
  const iv = randomBytes(12);
  const key = deriveKey(salt);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const enc = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [salt, iv, tag, enc].map((b) => b.toString("base64")).join(":");
}

export function decrypt(blob: string): string {
  const [saltB, ivB, tagB, dataB] = blob.split(":");
  const salt = Buffer.from(saltB, "base64");
  const iv = Buffer.from(ivB, "base64");
  const tag = Buffer.from(tagB, "base64");
  const data = Buffer.from(dataB, "base64");
  const key = deriveKey(salt);
  const decipher = createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(data), decipher.final()]).toString("utf8");
}
