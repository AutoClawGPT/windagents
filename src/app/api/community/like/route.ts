import { db } from "@/db/client";
import { communityLikes, communityPosts } from "@/db/schema";
import { requireUser, isUser } from "@/lib/auth";
import { generateId } from "@/lib/crypto";
import { and, eq } from "drizzle-orm";

export async function POST(req: Request) {
  const user = await requireUser(req);
  if (!isUser(user)) return user;
  try {
    const body = await req.json();
    const postId = String(body.postId || "").trim();
    if (!postId) return Response.json({ error: "postId required" }, { status: 400 });
    const [post] = await db.select().from(communityPosts).where(eq(communityPosts.id, postId)).limit(1);
    if (!post) return Response.json({ error: "Post not found" }, { status: 404 });

    const [existing] = await db
      .select()
      .from(communityLikes)
      .where(and(eq(communityLikes.postId, postId), eq(communityLikes.userId, user.id)))
      .limit(1);

    if (existing) {
      await db.delete(communityLikes).where(eq(communityLikes.id, existing.id));
      const next = Math.max(0, (post.likeCount || 0) - 1);
      await db.update(communityPosts).set({ likeCount: next }).where(eq(communityPosts.id, postId));
      return Response.json({ liked: false, likeCount: next });
    }

    await db.insert(communityLikes).values({ id: generateId(), postId, userId: user.id });
    const next = (post.likeCount || 0) + 1;
    await db.update(communityPosts).set({ likeCount: next }).where(eq(communityPosts.id, postId));
    return Response.json({ liked: true, likeCount: next });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Like failed";
    return Response.json({ error: msg }, { status: 500 });
  }
}
