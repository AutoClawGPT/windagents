import { db, ensureDb } from "@/db/client";
import { sessions, users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { hashToken, generateId, verifyAccessToken } from "./crypto";
import type { User } from "@/db/schema";
import { ensurePublicAgentRow } from "@/lib/ensure-agent-profile";
import { registryGetVault } from "@/lib/registry-upstash";


async function withRestoredVault(user: User): Promise<User> {
  if (user.encryptedKeys) return user;
  try {
    const vault = await registryGetVault(user.id);
    if (!vault) return user;
    await db
      .update(users)
      .set({ encryptedKeys: vault, updatedAt: new Date().toISOString() })
      .where(eq(users.id, user.id));
    return { ...user, encryptedKeys: vault };
  } catch (err) {
    console.error("[auth] vault restore failed", err);
    return user;
  }
}

export async function getBearerUser(req: Request): Promise<User | null> {
  const header = req.headers.get("authorization") || req.headers.get("Authorization");
  if (!header?.startsWith("Bearer ")) return null;
  const token = header.slice(7).trim();
  if (!token) return null;

  // Stateless wa1.* tokens (survive Vercel /tmp DB loss across isolates)
  const claims = verifyAccessToken(token);
  if (claims) {
    try {
      await ensureDb();
      const [row] = await db.select().from(users).where(eq(users.id, claims.sub)).limit(1);
      if (row) {
        if (claims.typ === "agent") {
          await ensurePublicAgentRow({ userId: row.id, name: row.displayName || claims.name || "Agent" });
        }
        return withRestoredVault(row);
      }
      // Heal vanished rows (common after /tmp SQLite on Vercel): recreate from wa1 claims
      const now = new Date().toISOString();
      const vaultCipher = await registryGetVault(claims.sub);
      await db.insert(users).values({
        id: claims.sub,
        type: claims.typ,
        email: claims.email ?? null,
        displayName: claims.name ?? null,
        authTokenHash: hashToken(token),
        encryptedKeys: vaultCipher,
        createdAt: now,
        updatedAt: now,
      });
      if (claims.typ === "agent") {
        await ensurePublicAgentRow({ userId: claims.sub, name: claims.name || "Agent" });
      }
      const [healed] = await db.select().from(users).where(eq(users.id, claims.sub)).limit(1);
      if (healed) return healed;
    } catch (err) {
      console.error("[auth] wa1 heal failed", err);
    }
    const now = new Date().toISOString();
    let vaultCipher: string | null = null;
    try {
      vaultCipher = await registryGetVault(claims.sub);
    } catch {}
    return {
      id: claims.sub,
      type: claims.typ,
      email: claims.email ?? null,
      walletAddress: null,
      authTokenHash: hashToken(token),
      ed25519PublicKey: null,
      payoutWallet: null,
      encryptedKeys: vaultCipher,
      skillMdContent: null,
      displayName: claims.name ?? null,
      moonpayEmail: null,
      createdAt: now,
      updatedAt: now,
    } as User;
  }

  const tokenHash = hashToken(token);

  const [session] = await db
    .select()
    .from(sessions)
    .where(eq(sessions.sessionToken, tokenHash))
    .limit(1);

  if (session) {
    if (new Date(session.expires) < new Date()) return null;
    const [user] = await db.select().from(users).where(eq(users.id, session.userId)).limit(1);
    if (!user) return null;
    return withRestoredVault(user);
  }

  // Fallback: match hashed auth token on user
  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.authTokenHash, tokenHash))
    .limit(1);
  if (!user) return null;
  return withRestoredVault(user);
}

export async function requireUser(req: Request): Promise<User | Response> {
  const user = await getBearerUser(req);
  if (!user) {
    return Response.json(
      { error: "unauthorized", message: "Bearer token required. Register or login first." },
      { status: 401 }
    );
  }
  return user;
}

export async function createSession(userId: string, rawToken: string, days = 90) {
  const expires = new Date(Date.now() + days * 86400000).toISOString();
  await db.insert(sessions).values({
    id: generateId(),
    userId,
    sessionToken: hashToken(rawToken),
    expires,
  });
}

export function isUser(result: User | Response): result is User {
  return !(result instanceof Response);
}
