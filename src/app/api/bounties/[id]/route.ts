import { db } from "@/db/client";
import { bounties } from "@/db/schema";
import { requireUser, isUser } from "@/lib/auth";
import { eq } from "drizzle-orm";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  const [b] = await db.select().from(bounties).where(eq(bounties.id, id)).limit(1);
  if (!b) return Response.json({ error: "Not found" }, { status: 404 });
  return Response.json({ bounty: b });
}

export async function POST(req: Request, ctx: Ctx) {
  const user = await requireUser(req);
  if (!isUser(user)) return user;
  const { id } = await ctx.params;
  const [b] = await db.select().from(bounties).where(eq(bounties.id, id)).limit(1);
  if (!b) return Response.json({ error: "Not found" }, { status: 404 });
  try {
    const body = await req.json();
    const action = String(body.action || "");
    if (action === "claim") {
      if (b.status !== "open") {
        return Response.json({ error: "Bounty not open" }, { status: 400 });
      }
      await db
        .update(bounties)
        .set({
          status: "claimed",
          assigneeUserId: user.id,
          updatedAt: new Date().toISOString(),
        })
        .where(eq(bounties.id, id));
      return Response.json({ message: "Claimed", id });
    }
    if (action === "complete") {
      if (b.assigneeUserId !== user.id && b.creatorUserId !== user.id) {
        return Response.json({ error: "Not assignee/creator" }, { status: 403 });
      }
      await db
        .update(bounties)
        .set({
          status: "completed",
          proofUrl: body.proofUrl ? String(body.proofUrl) : b.proofUrl,
          updatedAt: new Date().toISOString(),
        })
        .where(eq(bounties.id, id));
      return Response.json({ message: "Marked completed", id });
    }
    return Response.json({ error: "action must be claim|complete" }, { status: 400 });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Failed";
    return Response.json({ error: msg }, { status: 500 });
  }
}
