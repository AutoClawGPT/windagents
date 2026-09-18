import { db } from "@/db/client";
import { sessions, users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { hashToken, generateId } from "./crypto";
import type { User } from "@/db/schema";

export async function getBearerUser(req: Request): Promise<User | null> {
  const header = req.headers.get("authorization") || req.headers.get("Authorization");
  if (!header?.startsWith("Bearer ")) return null;
  const token = header.slice(7).trim();
  if (!token) return null;

  const tokenHash = hashToken(token);

  const [session] = await db
    .select()
    .from(sessions)
    .where(eq(sessions.sessionToken, tokenHash))
    .limit(1);

  if (session) {
    if (new Date(session.expires) < new Date()) return null;
    const [user] = await db.select().from(users).where(eq(users.id, session.userId)).limit(1);
    return user ?? null;
  }

  // Fallback: match hashed auth token on user
  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.authTokenHash, tokenHash))
    .limit(1);
  return user ?? null;
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
