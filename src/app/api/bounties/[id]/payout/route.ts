import { db, ensureDb } from "@/db/client";
import { bounties } from "@/db/schema";
import { requireUser, isUser } from "@/lib/auth";
import { eq } from "drizzle-orm";

type Ctx = { params: Promise<{ id: string }> };

export async function POST(req: Request, ctx: Ctx) {
  await ensureDb();
  const user = await requireUser(req);
  if (!isUser(user)) return user;
  const { id } = await ctx.params;
  const [b] = await db.select().from(bounties).where(eq(bounties.id, id)).limit(1);
  if (!b) return Response.json({ error: "Not found" }, { status: 404 });

  if (b.creatorUserId !== user.id) {
    return Response.json({ error: "Only bounty creator can request payout" }, { status: 403 });
  }
  if (b.status !== "completed" && b.status !== "claimed") {
    return Response.json(
      { error: "bounty_not_payable", message: "Bounty must be claimed or completed before payout." },
      { status: 400 }
    );
  }

  const treasuryKey = process.env.TREASURY_KEY || process.env.BOUNTY_TREASURY_KEY;
  if (!treasuryKey) {
    await db
      .update(bounties)
      .set({ status: "pending_payout", updatedAt: new Date().toISOString() })
      .where(eq(bounties.id, id));
    return Response.json({
      ok: true,
      status: "pending_treasury",
      message:
        "No TREASURY_KEY configured — bounty marked pending_payout. No fake tx signature issued. Set TREASURY_KEY to enable on-chain payouts.",
      bountyId: id,
      txSignature: null,
    });
  }

  // Honest stub even with key present until real signer wired
  await db
    .update(bounties)
    .set({ status: "pending_payout", updatedAt: new Date().toISOString() })
    .where(eq(bounties.id, id));
  return Response.json({
    ok: true,
    status: "pending_treasury",
    message:
      "Treasury key present but on-chain payout path not fully wired — marked pending_payout without inventing a signature.",
    bountyId: id,
    txSignature: null,
  });
}
