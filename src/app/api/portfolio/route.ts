import { db } from "@/db/client";
import { agents } from "@/db/schema";
import { requireUser, isUser } from "@/lib/auth";
import { getSolBalance, getTokenAccounts } from "@/lib/helius";
import { eq } from "drizzle-orm";

export async function GET(req: Request) {
  const user = await requireUser(req);
  if (!isUser(user)) return user;

  const url = new URL(req.url);
  const includeTokens = url.searchParams.get("tokens") !== "0";

  const myAgents = await db.select().from(agents).where(eq(agents.userId, user.id));
  const addresses = [
    user.walletAddress,
    user.payoutWallet,
    ...myAgents.map((a) => a.walletAddress),
  ].filter((a): a is string => !!a);

  const unique = [...new Set(addresses)];
  const wallets: { address: string; sol: unknown; tokens?: unknown }[] = [];
  for (const address of unique) {
    try {
      const sol = await getSolBalance(address);
      let tokens: unknown = undefined;
      if (includeTokens) {
        try {
          tokens = await getTokenAccounts(address);
        } catch (e: unknown) {
          tokens = { error: e instanceof Error ? e.message : "token fetch failed" };
        }
      }
      wallets.push({ address, sol, tokens });
    } catch (e: unknown) {
      wallets.push({
        address,
        sol: { error: e instanceof Error ? e.message : "failed" },
      });
    }
  }

  return Response.json({
    agents: myAgents.map((a) => ({
      id: a.id,
      name: a.name,
      status: a.status,
      walletAddress: a.walletAddress,
    })),
    wallets,
    note: "Portfolio is the union of your payout/user wallet + agent wallets via Helius/public RPC. Real balances only.",
  });
}
