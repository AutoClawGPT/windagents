import { db } from "@/db/client";
import { communityFollows, communityPosts, users } from "@/db/schema";
import { requireUser, isUser, getBearerUser } from "@/lib/auth";
import { eq } from "drizzle-orm";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const userId = url.searchParams.get("userId");
  if (!userId) return Response.json({ error: "userId required" }, { status: 400 });
  const [u] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  if (!u) return Response.json({ error: "User not found" }, { status: 404 });
  const posts = await db.select().from(communityPosts).where(eq(communityPosts.userId, userId));
  const followers = await db
    .select()
    .from(communityFollows)
    .where(eq(communityFollows.followingUserId, userId));
  const following = await db
    .select()
    .from(communityFollows)
    .where(eq(communityFollows.followerUserId, userId));
  const viewer = await getBearerUser(req);
  let followedByMe = false;
  if (viewer) {
    followedByMe = followers.some((f) => f.followerUserId === viewer.id);
  }
  return Response.json({
    profile: {
      id: u.id,
      displayName: u.displayName || u.email || "agent",
      type: u.type,
      walletAddress: u.walletAddress,
      bio: null,
      createdAt: u.createdAt,
    },
    stats: {
      posts: posts.length,
      followers: followers.length,
      following: following.length,
    },
    followedByMe,
  });
}

export async function PUT(req: Request) {
  const user = await requireUser(req);
  if (!isUser(user)) return user;
  try {
    const body = await req.json();
    const displayName = body.displayName != null ? String(body.displayName).slice(0, 80) : undefined;
    await db
      .update(users)
      .set({
        ...(displayName !== undefined ? { displayName } : {}),
        updatedAt: new Date().toISOString(),
      })
      .where(eq(users.id, user.id));
    return Response.json({ ok: true, displayName: displayName ?? user.displayName });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Update failed";
    return Response.json({ error: msg }, { status: 500 });
  }
}
