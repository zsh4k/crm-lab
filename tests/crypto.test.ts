import { test, expect } from "bun:test";
import { encrypt, decrypt } from "../src/server/lib/crypto";

test("encrypt/decrypt roundtrip", () => {
  const secret = "ya29.token-de-prueba-123";
  const blob = encrypt(secret);
  expect(blob).not.toContain(secret);
  expect(blob.split(":").length).toBe(4); // salt:iv:tag:ciphertext
  expect(decrypt(blob)).toBe(secret);
});

test("cada cifrado usa salt/iv distintos (no determinista)", () => {
  expect(encrypt("x")).not.toBe(encrypt("x"));
});

test("detecta tampering del ciphertext (authTag GCM)", () => {
  const blob = encrypt("dato sensible");
  const p = blob.split(":");
  const tampered = [p[0], p[1], p[2], Buffer.from("corrupto-distinto").toString("base64")].join(":");
  expect(() => decrypt(tampered)).toThrow();
});
