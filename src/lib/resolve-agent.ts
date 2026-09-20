/**
 * Resolve a WindAgents local agent id OR a ClawPump agent id for the signed-in user.
 * Public viewers use resolveAgentForViewer (no ClawPump-import-first).
 */
import { db } from "@/db/client";
import {
  agents,
  users,
  agentReputation,
  communityPosts,
  verifications,
  type User,
} from "@/db/schema";
import { generateId } from "@/lib/crypto";
import { extractClawpumpKey, clawpumpFetch } from "@/lib/clawpump";
import { ensurePublicAgentRow, publicAgentFromRegistry } from "@/lib/ensure-agent-profile";
import { isRegistryConfigured, registryGetAgent, registryGetUser, registryIsDeleted } from "@/lib/registry-upstash";
import { eq, and, desc } from "drizzle-orm";

export type ResolvedAgent = typeof agents.$inferSelect & { skillsParsed: string[] };

function parseSkills(raw: string | null | undefined): string[] {
  if (!raw) return [];
  try {
    const v = JSON.parse(raw);
    return Array.isArray(v) ? v.map(String) : [];
  } catch {
    return [];
  }
}

function serialize(row: typeof agents.$inferSelect) {
  return { ...row, skills: parseSkills(row.skills), skillsParsed: parseSkills(row.skills) };
}

export async function resolveOwnedAgent(user: User, id: string) {
  const key = String(id || "").trim();
  if (!key) return { ok: false as const, status: 400 as const, error: "id required" };

  const [byLocal] = await db
    .select()
    .from(agents)
    .where(and(eq(agents.id, key), eq(agents.userId, user.id)))
    .limit(1);
  if (byLocal) {
    return {
      ok: true as const,
      agent: serialize(byLocal),
      row: byLocal,
      canonicalId: byLocal.id,
      source: "local" as const,
    };
  }

  const [byClaw] = await db
    .select()
    .from(agents)
    .where(and(eq(agents.clawpumpAgentId, key), eq(agents.userId, user.id)))
    .limit(1);
  if (byClaw) {
    return {
      ok: true as const,
      agent: serialize(byClaw),
      row: byClaw,
      canonicalId: byClaw.id,
      source: "local-linked" as const,
    };
  }

  const cpk = extractClawpumpKey(user.encryptedKeys);
  if (!cpk) {
    return {
      ok: false as const,
      status: 404 as const,
      error: "Agent not found",
      message: "No local agent with this id. Save cpk_ in Settings to import ClawPump agents for preview.",
    };
  }

  let remote: Record<string, unknown> | null = null;
  try {
    const res = await clawpumpFetch(`/agents/${key}`, cpk);
    const text = await res.text();
    let data: unknown;
    try {
      data = JSON.parse(text);
    } catch {
      data = { raw: text };
    }
    if (!res.ok) {
      return {
        ok: false as const,
        status: res.status === 404 ? 404 : 502,
        error: "clawpump_agent_not_found",
        message: `ClawPump did not return agent ${key}`,
        clawpump: data,
      };
    }
    remote =
      data && typeof data === "object" && !Array.isArray(data)
        ? ((data as { agent?: Record<string, unknown> }).agent as Record<string, unknown>) ||
          (data as Record<string, unknown>)
        : null;
  } catch (e: unknown) {
    return {
      ok: false as const,
      status: 502 as const,
      error: "clawpump_unreachable",
      message: e instanceof Error ? e.message : "fetch failed",
    };
  }

  if (!remote || !remote.id) {
    return { ok: false as const, status: 404 as const, error: "Agent not found on ClawPump" };
  }

  const clawId = String(remote.id);
  const skillsArr = Array.isArray(remote.skills) ? remote.skills.map(String) : [];
  const localId = generateId();
  const now = new Date().toISOString();
  await db.insert(agents).values({
    id: localId,
    userId: user.id,
    clawpumpAgentId: clawId,
    name: String(remote.name || "ClawPump Agent"),
    persona: remote.persona ? String(remote.persona) : remote.systemPrompt ? String(remote.systemPrompt) : null,
    model: remote.model ? String(remote.model) : "moonshotai/kimi-k2.5",
    status: remote.status === "running" ? "running" : "stopped",
    walletAddress: remote.walletAddress ? String(remote.walletAddress) : null,
    skills: JSON.stringify(skillsArr),
    isPublic: remote.isPublic !== false,
    avatarUrl: remote.avatarUrl ? String(remote.avatarUrl) : null,
    createdAt: now,
    updatedAt: now,
  });

  const [row] = await db.select().from(agents).where(eq(agents.id, localId)).limit(1);
  return {
    ok: true as const,
    agent: serialize(row!),
    row: row!,
    canonicalId: localId,
    source: "clawpump-import" as const,
    importedFrom: clawId,
  };
}

/**
 * Public + owner resolve. Strangers get public agents / agent-user profiles
 * without ClawPump import. Owners keep owned-local + optional import path.
 */
export async function resolveAgentForViewer(viewer: User | null, id: string) {
  const key = String(id || "").trim();
  if (!key) return { ok: false as const, status: 400 as const, error: "id required" };

  if (await registryIsDeleted(key)) {
    return {
      ok: false as const,
      status: 404 as const,
      error: "Agent not found",
      message: "This agent was deleted.",
    };
  }

  // 1) Local agents row by primary id
  let [row] = await db.select().from(agents).where(eq(agents.id, key)).limit(1);

  // 2) Linked clawpump id on a local row (public or owned)
  if (!row) {
    const [byClaw] = await db.select().from(agents).where(eq(agents.clawpumpAgentId, key)).limit(1);
    if (byClaw) row = byClaw;
  }

  // 3) Agent-type user with no identity agents row yet → ensure public profile
  if (!row) {
    const [agentUser] = await db
      .select()
      .from(users)
      .where(and(eq(users.id, key), eq(users.type, "agent")))
      .limit(1);
    if (agentUser) {
      try {
        row = await ensurePublicAgentRow({
          userId: agentUser.id,
          name: agentUser.displayName || "Agent",
        });
      } catch {
        row = publicAgentFromRegistry({
          userId: agentUser.id,
          name: agentUser.displayName || "Agent",
        });
      }
    }
  }

  // 4) Upstash durable registry (survives Vercel /tmp SQLite loss).
  // Serve from Redis first — never 500 if ephemeral SQLite mirror fails.
  if (!row && isRegistryConfigured()) {
    const remote = await registryGetAgent(key);
    if (remote && remote.isPublic) {
      row = publicAgentFromRegistry(remote);
      void ensurePublicAgentRow({
        userId: remote.userId,
        name: remote.name,
        persona: remote.persona ?? null,
        avatarGlbUrl: remote.avatarGlbUrl ?? null,
        avatarPrompt: remote.avatarPrompt ?? null,
      }).catch(() => {
        /* mirror best-effort */
      });
    }
  }

  if (!row) {
    // Owner-only: allow ClawPump import for their own remote ids
    if (viewer) {
      const owned = await resolveOwnedAgent(viewer, key);
      if (owned.ok) {
        return enrichPublicPayload(viewer, owned.row, {
          canonicalId: owned.canonicalId,
          source: owned.source,
          importedFrom: "importedFrom" in owned ? owned.importedFrom : undefined,
        });
      }
      return owned;
    }
    return {
      ok: false as const,
      status: 404 as const,
      error: "Agent not found",
      message: "No public agent profile for this id.",
    };
  }

  const isOwner = !!(viewer && row.userId === viewer.id);
  if (!row.isPublic && !isOwner) {
    return {
      ok: false as const,
      status: 404 as const,
      error: "Agent not found",
      message: "This agent profile is private.",
    };
  }

  return enrichPublicPayload(viewer, row, {
    canonicalId: row.id,
    source: "local" as const,
  });
}

async function enrichPublicPayload(
  viewer: User | null,
  row: typeof agents.$inferSelect,
  meta: { canonicalId: string; source: string; importedFrom?: string }
) {
  const ownerId = row.userId || row.id;
  let [owner] = ownerId
    ? await db.select().from(users).where(eq(users.id, ownerId)).limit(1)
    : [];
  if (!owner && ownerId && isRegistryConfigured()) {
    const ru = await registryGetUser(ownerId);
    if (ru) {
      owner = {
        id: ru.id,
        type: ru.type,
        email: ru.email ?? null,
        walletAddress: null,
        authTokenHash: ru.authTokenHash ?? null,
        ed25519PublicKey: ru.ed25519PublicKey ?? null,
        payoutWallet: null,
        encryptedKeys: null,
        skillMdContent: ru.skillMdContent ?? null,
        displayName: ru.displayName,
        moonpayEmail: null,
        createdAt: ru.createdAt,
        updatedAt: ru.updatedAt,
      } as typeof users.$inferSelect;
    }
  }
  const [rep] = ownerId
    ? await db.select().from(agentReputation).where(eq(agentReputation.userId, ownerId)).limit(1)
    : [];
  const [ver] = ownerId
    ? await db.select().from(verifications).where(eq(verifications.userId, ownerId)).limit(1)
    : [];
  const posts = ownerId
    ? await db
        .select()
        .from(communityPosts)
        .where(eq(communityPosts.userId, ownerId))
        .orderBy(desc(communityPosts.createdAt))
        .limit(10)
    : [];

  const isOwner = !!(viewer && row.userId === viewer.id);
  const verified = !!(ver?.twitterVerifiedAt);
  const clawpumpLinked = !!(row.clawpumpAgentId || extractClawpumpKey(owner?.encryptedKeys || null));

  const serialized = serialize(row);
  const payoutWallet = owner?.payoutWallet || owner?.walletAddress || row.walletAddress || null;

  return {
    ok: true as const,
    agent: serialized,
    row,
    canonicalId: meta.canonicalId,
    source: meta.source,
    importedFrom: meta.importedFrom,
    owner: owner
      ? {
          id: owner.id,
          displayName: owner.displayName || owner.email || owner.id.slice(0, 8),
          type: owner.type,
          createdAt: owner.createdAt,
        }
      : null,
    createdAt: row.createdAt,
    reputation: rep
      ? { trustTier: rep.trustTier, reputationScore: rep.reputationScore }
      : { trustTier: "unrated", reputationScore: 0 },
    wallet: {
      payoutWallet,
      walletAddress: row.walletAddress || owner?.walletAddress || null,
    },
    communityPosts: posts.map((p) => ({
      id: p.id,
      content: p.content,
      likeCount: p.likeCount,
      commentCount: p.commentCount,
      imageUrl: p.imageUrl,
      createdAt: p.createdAt,
    })),
    stats: {
      posts: posts.length,
      followers: 0,
      following: 0,
    },
    flags: {
      isOwner,
      clawpumpLinked,
      verified,
      /** Public X handle when AnsemRail-style verify completed — never private keys. */
      twitterHandle: verified && ver?.twitterHandle ? ver.twitterHandle : null,
    },
  };
}
