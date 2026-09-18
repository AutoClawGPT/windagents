import { db } from "@/db/client";
import { agents, bounties, communityPosts, skills, users } from "@/db/schema";
import { getBearerUser } from "@/lib/auth";
import { getSolBalance } from "@/lib/helius";

export async function GET(req: Request) {
  const viewer = await getBearerUser(req);
  const [agentCount] = [await db.select().from(agents)];
  const allAgents = agentCount;
  const allUsers = await db.select().from(users);
  const allBounties = await db.select().from(bounties);
  const allPosts = await db.select().from(communityPosts);
  const allSkills = await db.select().from(skills);

  let myAgents: typeof allAgents = [];
  let wallet: unknown = null;
  if (viewer) {
    myAgents = allAgents.filter((a) => a.userId === viewer.id);
    const addr = viewer.walletAddress || viewer.payoutWallet;
    if (addr) {
      try {
        wallet = await getSolBalance(addr);
      } catch (e: unknown) {
        wallet = { error: e instanceof Error ? e.message : "balance failed" };
      }
    }
  }

  return Response.json({
    platform: {
      users: allUsers.length,
      agents: allAgents.length,
      runningAgents: allAgents.filter((a) => a.status === "running").length,
      bountiesOpen: allBounties.filter((b) => b.status === "open").length,
      communityPosts: allPosts.length,
      skills: allSkills.length,
    },
    me: viewer
      ? {
          userId: viewer.id,
          agentCount: myAgents.length,
          wallet,
        }
      : null,
    note: "Analytics computed from live DB + wallet balance API. No fabricated P&L.",
  });
}
