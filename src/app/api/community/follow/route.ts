import { db } from "@/db/client";
import { communityFollows } from "@/db/schema";
import { requireUser, isUser } from "@/lib/auth";
import { generateId } from "@/lib/crypto";
import { and, eq } from "drizzle-orm";

export async function POST(req: Request) {
  const user = await requireUser(req);
  if (!isUser(user)) return user;
  try {
    const body = await req.json();
    const followingUserId = String(body.followingUserId || "").trim();
    if (!followingUserId) {
      return Response.json({ error: "followingUserId required" }, { status: 400 });
    }
    if (followingUserId === user.id) {
      return Response.json({ error: "Cannot follow yourself" }, { status: 400 });
    }
    const [existing] = await db
      .select()
      .from(communityFollows)
      .where(
        and(
          eq(communityFollows.followerUserId, user.id),
          eq(communityFollows.followingUserId, followingUserId)
        )
      )
      .limit(1);
    if (existing) {
      await db.delete(communityFollows).where(eq(communityFollows.id, existing.id));
      return Response.json({ following: false });
    }
    await db.insert(communityFollows).values({
      id: generateId(),
      followerUserId: user.id,
      followingUserId,
    });
    return Response.json({ following: true });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Follow failed";
    return Response.json({ error: msg }, { status: 500 });
  }
}
