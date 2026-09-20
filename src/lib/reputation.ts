/**
 * Reputation dual-write: SQLite (local) + Redis (durable on Vercel).
 * Leaderboard prefers Redis so ranks survive isolate heals.
 */
import { db } from "@/db/client";
import { agentReputation } from "@/db/schema";
import { eq } from "drizzle-orm";
import { generateId } from "@/lib/crypto";
import {
  registryUpsertReputationScore,
  registryListReputations,
  type RegistryReputation,
} from "@/lib/registry-upstash";

function tierFor(score: number): string {
  if (score >= 1000) return "platinum";
  if (score >= 500) return "gold";
  if (score >= 100) return "silver";
  if (score >= 10) return "bronze";
  return "unrated";
}

export async function bumpReputation(
  userId: string,
  delta: number,
  meta?: { displayName?: string | null; type?: string | null }
): Promise<void> {
  if (!userId || !delta) return;

  // Durable Redis first
  const redisRow = await registryUpsertReputationScore(userId, delta, {
    displayName: meta?.displayName,
    type: meta?.type,
  });
  const trustTier = tierFor(redisRow.reputationScore);
  if (trustTier !== redisRow.trustTier) {
    await registryUpsertReputationScore(userId, 0, {
      trustTier,
      displayName: meta?.displayName,
      type: meta?.type,
    });
  }

  // Best-effort local SQLite (may be ephemeral on Vercel)
  try {
    const [existing] = await db
      .select()
      .from(agentReputation)
      .where(eq(agentReputation.userId, userId))
      .limit(1);
    if (existing) {
      const score = Math.max(0, existing.reputationScore + delta);
      await db
        .update(agentReputation)
        .set({ reputationScore: score, trustTier: tierFor(score) })
        .where(eq(agentReputation.id, existing.id));
    } else {
      await db.insert(agentReputation).values({
        id: generateId(),
        userId,
        trustTier: tierFor(Math.max(0, delta)),
        reputationScore: Math.max(0, delta),
      });
    }
  } catch (err) {
    console.error("[reputation] sqlite write failed", err);
  }
}

export async function listDurableLeaderboard(): Promise<RegistryReputation[]> {
  const fromRedis = await registryListReputations();
  if (fromRedis.length > 0) {
    return fromRedis.sort((a, b) => b.reputationScore - a.reputationScore);
  }
  // Fallback to SQLite when Redis empty (local/dev)
  try {
    const all = await db.select().from(agentReputation);
    return all
      .map((r) => ({
        userId: r.userId,
        trustTier: r.trustTier,
        reputationScore: r.reputationScore,
        displayName: null,
        type: null,
        updatedAt: new Date().toISOString(),
      }))
      .sort((a, b) => b.reputationScore - a.reputationScore);
  } catch {
    return [];
  }
}
