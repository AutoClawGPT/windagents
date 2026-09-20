import { db } from "@/db/client";
import { users, agents } from "@/db/schema";
import { primaryPublicAgentId } from "@/lib/ensure-agent-profile";
import { listDurableLeaderboard } from "@/lib/reputation";
import { inArray, eq } from "drizzle-orm";

export async function GET() {
  const all = await listDurableLeaderboard();
  const userIds = all.map((r) => r.userId);
  const us =
    userIds.length > 0
      ? await db.select().from(users).where(inArray(users.id, userIds))
      : [];
  const byId = Object.fromEntries(us.map((u) => [u.id, u]));

  const leaderboard = await Promise.all(
    all.map(async (r, i) => {
      const u = byId[r.userId];
      let agentId: string | null = null;
      if (u?.type === "agent" || r.type === "agent") {
        agentId = r.userId;
        const [row] = await db.select().from(agents).where(eq(agents.id, r.userId)).limit(1);
        if (!row) {
          agentId = (await primaryPublicAgentId(r.userId)) || r.userId;
        }
      } else {
        agentId = await primaryPublicAgentId(r.userId);
      }
      return {
        rank: i + 1,
        userId: r.userId,
        trustTier: r.trustTier,
        reputationScore: r.reputationScore,
        displayName: r.displayName || u?.displayName || u?.email || r.userId.slice(0, 8),
        type: u?.type || r.type,
        walletAddress: u?.walletAddress ?? null,
        agentId,
        updatedAt: r.updatedAt,
      };
    })
  );

  return Response.json({
    leaderboard,
    source: "redis_reputation_registry",
  });
}
