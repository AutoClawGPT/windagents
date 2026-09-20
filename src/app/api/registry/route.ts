import { db } from "@/db/client";
import { agentReputation, users, agents } from "@/db/schema";
import { requireUser, isUser } from "@/lib/auth";
import { generateId } from "@/lib/crypto";
import { primaryPublicAgentId } from "@/lib/ensure-agent-profile";
import { bumpReputation, listDurableLeaderboard } from "@/lib/reputation";
import { eq } from "drizzle-orm";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const userId = url.searchParams.get("userId");
  if (userId) {
    // Prefer durable Redis row; fall back to ephemeral SQLite mirror.
    const durable = await listDurableLeaderboard();
    const hit = durable.find((r) => r.userId === userId);
    if (hit) {
      return Response.json({
        reputation: {
          userId: hit.userId,
          trustTier: hit.trustTier,
          reputationScore: hit.reputationScore,
          displayName: hit.displayName,
          type: hit.type,
          updatedAt: hit.updatedAt,
        },
      });
    }
    const [rep] = await db
      .select()
      .from(agentReputation)
      .where(eq(agentReputation.userId, userId))
      .limit(1);
    return Response.json({ reputation: rep || null });
  }

  // Durable Upstash list — same source as /api/leaderboard (survives Vercel /tmp SQLite).
  const all = await listDurableLeaderboard();
  const leaderboard = await Promise.all(
    all.map(async (r, i) => {
      let agentId: string | null = null;
      if (r.type === "agent") {
        agentId = r.userId;
        const [row] = await db.select().from(agents).where(eq(agents.id, r.userId)).limit(1);
        if (!row) {
          agentId = (await primaryPublicAgentId(r.userId)) || r.userId;
        }
      } else {
        agentId = (await primaryPublicAgentId(r.userId)) || r.userId;
      }
      const [u] = await db.select().from(users).where(eq(users.id, r.userId)).limit(1);
      return {
        rank: i + 1,
        userId: r.userId,
        trustTier: r.trustTier,
        reputationScore: r.reputationScore,
        displayName: r.displayName || u?.displayName || u?.email || r.userId.slice(0, 8),
        type: u?.type || r.type,
        agentId,
        updatedAt: r.updatedAt,
      };
    })
  );

  return Response.json({ leaderboard });
}

export async function POST(req: Request) {
  const user = await requireUser(req);
  if (!isUser(user)) return user;
  try {
    const body = await req.json();
    const action = String(body.action || "register");

    const [existing] = await db
      .select()
      .from(agentReputation)
      .where(eq(agentReputation.userId, user.id))
      .limit(1);

    if (action === "register") {
      if (existing) return Response.json({ reputation: existing, message: "Already registered" });
      const id = generateId();
      await db.insert(agentReputation).values({
        id,
        userId: user.id,
        trustTier: "bronze",
        reputationScore: 1,
      });
      const [rep] = await db.select().from(agentReputation).where(eq(agentReputation.id, id)).limit(1);
      await bumpReputation(user.id, 1, { displayName: user.displayName, type: user.type });
      return Response.json({ reputation: rep, message: "Registered in agent registry" });
    }

    if (action === "update") {
      if (!existing) {
        return Response.json({ error: "Register first with action=register" }, { status: 400 });
      }
      const trades = Number(body.trades || 0);
      const launches = Number(body.launches || 0);
      const score = existing.reputationScore + trades * 2 + launches * 5;
      let tier = existing.trustTier;
      if (score >= 100) tier = "platinum";
      else if (score >= 50) tier = "gold";
      else if (score >= 20) tier = "silver";
      else tier = "bronze";

      await db
        .update(agentReputation)
        .set({
          reputationScore: score,
          totalTrades: existing.totalTrades + trades,
          totalLaunches: existing.totalLaunches + launches,
          trustTier: tier,
        })
        .where(eq(agentReputation.id, existing.id));

      const [rep] = await db
        .select()
        .from(agentReputation)
        .where(eq(agentReputation.id, existing.id))
        .limit(1);
      await bumpReputation(user.id, trades * 2 + launches * 5, {
        displayName: user.displayName,
        type: user.type,
      });
      return Response.json({ reputation: rep });
    }

    return Response.json({ error: "Unknown action" }, { status: 400 });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Registry failed";
    return Response.json({ error: msg }, { status: 500 });
  }
}
