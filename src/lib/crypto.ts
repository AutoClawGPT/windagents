import { createCipheriv, createDecipheriv, scryptSync, randomBytes, createHash } from "crypto";

const ALGORITHM = "aes-256-gcm";

function getKey(): Buffer {
  const secret = process.env.ENCRYPTION_KEY || "windagents-dev-key-change-me";
  return scryptSync(secret, "windagents-salt-v1", 32);
}

export type EncryptedBlob = { encrypted: string; iv: string; tag: string };

export function encrypt(text: string): EncryptedBlob {
  const key = getKey();
  const iv = randomBytes(16);
  const cipher = createCipheriv(ALGORITHM, key, iv);
  let encrypted = cipher.update(text, "utf8", "hex");
  encrypted += cipher.final("hex");
  const tag = cipher.getAuthTag();
  return { encrypted, iv: iv.toString("hex"), tag: tag.toString("hex") };
}

export function decrypt(data: EncryptedBlob): string {
  const key = getKey();
  const decipher = createDecipheriv(ALGORITHM, key, Buffer.from(data.iv, "hex"));
  decipher.setAuthTag(Buffer.from(data.tag, "hex"));
  let decrypted = decipher.update(data.encrypted, "hex", "utf8");
  decrypted += decipher.final("utf8");
  return decrypted;
}

export function encryptApiKey(apiKey: string): string {
  return JSON.stringify(encrypt(apiKey));
}

export function decryptApiKey(encryptedJson: string): string {
  try {
    return decrypt(JSON.parse(encryptedJson));
  } catch {
    return encryptedJson;
  }
}

export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function generateToken(): string {
  return randomBytes(32).toString("hex");
}

export function generateId(): string {
  return randomBytes(16).toString("hex");
}
