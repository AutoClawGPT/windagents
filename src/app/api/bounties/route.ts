import { db } from "@/db/client";
import { bounties } from "@/db/schema";
import { requireUser, isUser } from "@/lib/auth";
import { generateId } from "@/lib/crypto";
import { eq } from "drizzle-orm";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const status = url.searchParams.get("status");
  let rows = await db.select().from(bounties);
  if (status) rows = rows.filter((b) => b.status === status);
  return Response.json({ bounties: rows });
}

export async function POST(req: Request) {
  const user = await requireUser(req);
  if (!isUser(user)) return user;
  try {
    const body = await req.json();
    const title = String(body.title || "").trim();
    const description = String(body.description || "").trim();
    const rewardAmount = String(body.rewardAmount || "").trim();
    if (!title || !description || !rewardAmount) {
      return Response.json({ error: "title, description, rewardAmount required" }, { status: 400 });
    }
    const id = generateId();
    await db.insert(bounties).values({
      id,
      creatorUserId: user.id,
      title,
      description,
      rewardToken: String(body.rewardToken || "SOL"),
      rewardAmount,
      deliverable: body.deliverable ? String(body.deliverable) : null,
      status: "open",
    });
    return Response.json({ id, message: "Bounty created" });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Create failed";
    return Response.json({ error: msg }, { status: 500 });
  }
}
