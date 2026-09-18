import { createCipheriv, createDecipheriv, scryptSync, randomBytes, createHash, createHmac } from "crypto";

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


/** Stateless bearer tokens for Vercel (no shared disk). Format: wa1.<b64url(payload)>.<hmac> */
function b64url(input: string | Buffer): string {
  return Buffer.from(input)
    .toString("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
}

function b64urlJson(obj: unknown): string {
  return b64url(JSON.stringify(obj));
}

function hmacKey(): Buffer {
  return createHash("sha256").update(process.env.ENCRYPTION_KEY || "windagents-dev-key-change-me").digest();
}

export type AccessTokenClaims = {
  sub: string;
  typ: "human" | "agent";
  name?: string | null;
  email?: string | null;
  iat: number;
  exp: number;
};

export function signAccessToken(claims: Omit<AccessTokenClaims, "iat" | "exp"> & { days?: number }): string {
  const days = claims.days ?? 90;
  const { days: _d, ...rest } = claims as AccessTokenClaims & { days?: number };
  const payload: AccessTokenClaims = {
    ...rest,
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + days * 86400,
  };
  const body = b64urlJson(payload);
  const sig = createHmac("sha256", hmacKey()).update(body).digest("base64url");
  return `wa1.${body}.${sig}`;
}

export function verifyAccessToken(token: string): AccessTokenClaims | null {
  if (!token.startsWith("wa1.")) return null;
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  const [, body, sig] = parts;
  const expect = createHmac("sha256", hmacKey()).update(body).digest("base64url");
  if (sig !== expect) return null;
  try {
    const json = Buffer.from(body.replace(/-/g, "+").replace(/_/g, "/"), "base64").toString("utf8");
    const claims = JSON.parse(json) as AccessTokenClaims;
    if (!claims.sub || !claims.typ || !claims.exp) return null;
    if (claims.exp < Math.floor(Date.now() / 1000)) return null;
    return claims;
  } catch {
    return null;
  }
}
