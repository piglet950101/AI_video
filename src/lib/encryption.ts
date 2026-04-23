import crypto from "node:crypto";
import { env } from "./env";

const ALGO = "aes-256-gcm";
const IV_LENGTH = 12;

function getKey(): Buffer {
  // ENCRYPTION_KEY is base64(32 bytes). Allow hex fallback of 64 chars.
  const raw = env.ENCRYPTION_KEY;
  if (/^[0-9a-fA-F]{64}$/.test(raw)) return Buffer.from(raw, "hex");
  const buf = Buffer.from(raw, "base64");
  if (buf.length !== 32) {
    throw new Error("ENCRYPTION_KEY must decode to 32 bytes (base64 of 32 bytes or 64 hex chars)");
  }
  return buf;
}

export interface Ciphertext {
  cipher: string; // base64
  iv: string;     // base64
  tag: string;    // base64
}

export function encrypt(plaintext: string): Ciphertext {
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGO, getKey(), iv);
  const enc = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  return {
    cipher: enc.toString("base64"),
    iv: iv.toString("base64"),
    tag: cipher.getAuthTag().toString("base64"),
  };
}

export function decrypt(ct: Ciphertext): string {
  const decipher = crypto.createDecipheriv(
    ALGO,
    getKey(),
    Buffer.from(ct.iv, "base64")
  );
  decipher.setAuthTag(Buffer.from(ct.tag, "base64"));
  const dec = Buffer.concat([
    decipher.update(Buffer.from(ct.cipher, "base64")),
    decipher.final(),
  ]);
  return dec.toString("utf8");
}

export function sha256Hex(value: string): string {
  return crypto.createHash("sha256").update(value).digest("hex");
}
