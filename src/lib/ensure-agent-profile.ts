/**
 * Ensure every skill.md / Ed25519 agent user has a public agents row
 * with id === userId (one identity everywhere for /agents/[id] previews).
 *
 * On Vercel, SQLite under /tmp is ephemeral and often missing the users FK
 * row for Redis-registered skill.md agents. We still try to mirror into
 * SQLite, but never 500 the public profile — fall back to a synthetic row
 * built from durable Upstash registry fields.
 */
import { db } from "@/db/client";
import { agents, users } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import {
  isRegistryConfigured,
  registryEnsurePublicAgent,
  registryPutUser,
  registryIsDeleted,
} from "@/lib/registry-upstash";

export function syntheticAgentRow(opts: {
  userId: string;
  name: string;
  persona?: string | null;
  avatarGlbUrl?: string | null;
  avatarPrompt?: string | null;
  createdAt?: string;
  updatedAt?: string;
}): typeof agents.$inferSelect {
  const now = new Date().toISOString();
  return {
    id: opts.userId,
    userId: opts.userId,
    clawpumpAgentId: null,
    name: opts.name || "Agent",
    persona: opts.persona ?? null,
    model: "moonshotai/kimi-k2.5",
    status: "stopped",
    walletAddress: null,
    skills: null,
    isPublic: true,
    avatarUrl: null,
    avatarGlbUrl: opts.avatarGlbUrl ?? null,
    avatarPrompt: opts.avatarPrompt ?? null,
    tokenMint: null,
    createdAt: opts.createdAt || now,
    updatedAt: opts.updatedAt || now,
  };
}


/** Build a public agents row from durable registry — no SQLite required. */
export function publicAgentFromRegistry(remote: {
  userId: string;
  name: string;
  persona?: string | null;
  avatarGlbUrl?: string | null;
  avatarPrompt?: string | null;
  model?: string | null;
  status?: string;
  skills?: string | null;
  clawpumpAgentId?: string | null;
  createdAt?: string;
  updatedAt?: string;
}): typeof agents.$inferSelect {
  const now = new Date().toISOString();
  return {
    id: remote.userId,
    userId: remote.userId,
    clawpumpAgentId: remote.clawpumpAgentId ?? null,
    name: remote.name || "Agent",
    persona: remote.persona ?? null,
    model: remote.model || "moonshotai/kimi-k2.5",
    status: remote.status || "stopped",
    walletAddress: null,
    skills: remote.skills ?? null,
    isPublic: true,
    avatarUrl: null,
    avatarGlbUrl: remote.avatarGlbUrl ?? null,
    avatarPrompt: remote.avatarPrompt ?? null,
    tokenMint: null,
    createdAt: remote.createdAt || now,
    updatedAt: remote.updatedAt || now,
  };
}

async function ensureAgentUserRow(userId: string, name: string) {
  const [existing] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  if (existing) return existing;
  const now = new Date().toISOString();
  try {
    await db.insert(users).values({
      id: userId,
      type: "agent",
      displayName: name || "Agent",
      createdAt: now,
      updatedAt: now,
    });
  } catch {
    /* race / readonly ephemeral sqlite */
  }
  const [row] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  return row ?? null;
}

export async function ensurePublicAgentRow(opts: {
  userId: string;
  name: string;
  persona?: string | null;
  avatarGlbUrl?: string | null;
  avatarPrompt?: string | null;
}) {
  const { userId, name, persona = null, avatarGlbUrl = null, avatarPrompt = null } = opts;
  if (await registryIsDeleted(userId)) {
    return null as unknown as typeof agents.$inferSelect;
  }

  const [existing] = await db.select().from(agents).where(eq(agents.id, userId)).limit(1);
  if (existing) {
    if (isRegistryConfigured()) {
      await registryEnsurePublicAgent({ userId, name: existing.name || name, persona });
    }
    return existing;
  }

  const now = new Date().toISOString();
  await ensureAgentUserRow(userId, name);

  try {
    await db.insert(agents).values({
      id: userId,
      userId,
      name: name || "Agent",
      persona,
      status: "stopped",
      isPublic: true,
      avatarGlbUrl,
      avatarPrompt,
      createdAt: now,
      updatedAt: now,
    });
    const [row] = await db.select().from(agents).where(eq(agents.id, userId)).limit(1);
    if (isRegistryConfigured()) {
      await registryPutUser({
        id: userId,
        type: "agent",
        displayName: name || "Agent",
        createdAt: now,
        updatedAt: now,
      });
      await registryEnsurePublicAgent({ userId, name, persona });
    }
    return row ?? syntheticAgentRow(opts);
  } catch {
    // Ephemeral SQLite (or FK) failed — still serve Redis-backed public profile.
    if (isRegistryConfigured()) {
      try {
        await registryPutUser({
          id: userId,
          type: "agent",
          displayName: name || "Agent",
          createdAt: now,
          updatedAt: now,
        });
        await registryEnsurePublicAgent({ userId, name, persona });
      } catch {
        /* registry best-effort */
      }
    }
    return syntheticAgentRow({ ...opts, createdAt: now, updatedAt: now });
  }
}

/** One-shot: for each users.type=agent missing agents.id=userId, insert public row. */
export async function backfillPublicAgentProfiles(): Promise<number> {
  const agentUsers = await db.select().from(users).where(eq(users.type, "agent"));
  let created = 0;
  for (const u of agentUsers) {
    const [row] = await db.select().from(agents).where(eq(agents.id, u.id)).limit(1);
    if (row) continue;
    await ensurePublicAgentRow({
      userId: u.id,
      name: u.displayName || "Agent",
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
