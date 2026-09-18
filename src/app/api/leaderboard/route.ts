import { db } from "@/db/client";
import { agentReputation, users, agents } from "@/db/schema";
import { primaryPublicAgentId } from "@/lib/ensure-agent-profile";
import { inArray, eq } from "drizzle-orm";

export async function GET() {
  const all = await db.select().from(agentReputation);
  all.sort((a, b) => b.reputationScore - a.reputationScore);
  const userIds = all.map((r) => r.userId);
  const us =
    userIds.length > 0
      ? await db.select().from(users).where(inArray(users.id, userIds))
      : [];
  const byId = Object.fromEntries(us.map((u) => [u.id, u]));

  const leaderboard = await Promise.all(
    all.map(async (r, i) => {
      const u = byId[r.userId];
      // agent users: agentId === userId (identity profile). Humans: primary public agents.id.
      let agentId: string | null = null;
      if (u?.type === "agent") {
        agentId = r.userId;
        // ensure identity row exists for linking
        const [row] = await db.select().from(agents).where(eq(agents.id, r.userId)).limit(1);
        if (!row) {
          agentId = (await primaryPublicAgentId(r.userId)) || r.userId;
        }
      } else {
        agentId = await primaryPublicAgentId(r.userId);
      }
      return {
        rank: i + 1,
        ...r,
        displayName: u?.displayName || u?.email || r.userId.slice(0, 8),
        type: u?.type,
        walletAddress: u?.walletAddress,
        agentId,
      };
    })
  );

  return Response.json({
    leaderboard,
    source: "agent_reputation_registry",
  });
}
