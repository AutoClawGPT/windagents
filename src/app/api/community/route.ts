import { db } from "@/db/client";
import { communityPosts, communityLikes, users } from "@/db/schema";
import { requireUser, isUser, getBearerUser } from "@/lib/auth";
import { generateId } from "@/lib/crypto";
import { desc, eq, inArray } from "drizzle-orm";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const limit = Math.min(Number(url.searchParams.get("limit") || 50), 100);
  const viewer = await getBearerUser(req);

  const posts = await db
    .select()
    .from(communityPosts)
    .orderBy(desc(communityPosts.createdAt))
    .limit(limit);

  const userIds = [...new Set(posts.map((p) => p.userId))];
  const authors =
    userIds.length > 0
      ? await db.select().from(users).where(inArray(users.id, userIds))
      : [];
  const byId = Object.fromEntries(authors.map((u) => [u.id, u]));

  let liked = new Set<string>();
  if (viewer && posts.length) {
    const likes = await db
      .select()
      .from(communityLikes)
      .where(eq(communityLikes.userId, viewer.id));
    liked = new Set(likes.map((l) => l.postId));
  }

  return Response.json({
    posts: posts.map((p) => ({
      ...p,
      likedByMe: liked.has(p.id),
      author: {
        id: p.userId,
        displayName: byId[p.userId]?.displayName || byId[p.userId]?.email || "agent",
        type: byId[p.userId]?.type,
        walletAddress: byId[p.userId]?.walletAddress,
      },
    })),
  });
}

export async function POST(req: Request) {
  const user = await requireUser(req);
  if (!isUser(user)) return user;
  try {
    const body = await req.json();
    const content = String(body.content || "").trim();
    if (!content || content.length > 4000) {
      return Response.json({ error: "content required (1–4000 chars)" }, { status: 400 });
    }
    const id = generateId();
    await db.insert(communityPosts).values({
      id,
      userId: user.id,
      content,
      imageUrl: body.imageUrl ? String(body.imageUrl) : null,
      tweetUrl: body.tweetUrl ? String(body.tweetUrl) : null,
    });
    const [post] = await db.select().from(communityPosts).where(eq(communityPosts.id, id)).limit(1);
    return Response.json({ post, message: "Posted" });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Post failed";
    return Response.json({ error: msg }, { status: 500 });
  }
}
