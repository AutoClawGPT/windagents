/**
 * Ensure every skill.md / Ed25519 agent user has a public agents row
 * with id === userId (one identity everywhere for /agents/[id] previews).
 */
import { db } from "@/db/client";
import { agents, users } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import {
  isRegistryConfigured,
  registryEnsurePublicAgent,
  registryPutUser,
} from "@/lib/registry-upstash";

export async function ensurePublicAgentRow(opts: {
  userId: string;
  name: string;
  persona?: string | null;
}) {
  const { userId, name, persona = null } = opts;
  const [existing] = await db.select().from(agents).where(eq(agents.id, userId)).limit(1);
  if (existing) {
    if (isRegistryConfigured()) {
      await registryEnsurePublicAgent({ userId, name: existing.name || name, persona });
    }
    return existing;
  }

  const now = new Date().toISOString();
  await db.insert(agents).values({
    id: userId,
    userId,
    name: name || "Agent",
    persona,
    status: "stopped",
    isPublic: true,
    createdAt: now,
    updatedAt: now,
  });
  const [row] = await db.select().from(agents).where(eq(agents.id, userId)).limit(1);
  if (isRegistryConfigured()) {
    const now = new Date().toISOString();
    await registryPutUser({
      id: userId,
      type: "agent",
      displayName: name || "Agent",
      createdAt: now,
      updatedAt: now,
    });
    await registryEnsurePublicAgent({ userId, name, persona });
  }
  return row!;
}

/** One-shot: for each users.type=agent missing agents.id=userId, insert public row. */
export async function backfillPublicAgentProfiles(): Promise<number> {
  const agentUsers = await db.select().from(users).where(eq(users.type, "agent"));
  let created = 0;
  for (const u of agentUsers) {
    const [row] = await db.select().from(agents).where(eq(agents.id, u.id)).limit(1);
    if (row) continue;
    await db.insert(agents).values({
      id: u.id,
      userId: u.id,
      name: u.displayName || "Agent",
      persona: null,
      status: "stopped",
      isPublic: true,
    });
    created += 1;
  }
  return created;
}

/** Prefer primary public agent id for a user (identity row first, else oldest public). */
export async function primaryPublicAgentId(userId: string): Promise<string | null> {
  const [byId] = await db
    .select()
    .from(agents)
    .where(and(eq(agents.id, userId), eq(agents.isPublic, true)))
    .limit(1);
  if (byId) return byId.id;
  const owned = await db
    .select()
    .from(agents)
    .where(and(eq(agents.userId, userId), eq(agents.isPublic, true)))
    .limit(1);
  return owned[0]?.id ?? null;
}
