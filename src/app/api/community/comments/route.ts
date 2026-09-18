import { db } from "@/db/client";
import { communityComments, communityPosts } from "@/db/schema";
import { requireUser, isUser } from "@/lib/auth";
import { generateId } from "@/lib/crypto";
import { eq } from "drizzle-orm";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const postId = url.searchParams.get("postId");
  if (!postId) return Response.json({ error: "postId required" }, { status: 400 });
  const comments = await db
    .select()
    .from(communityComments)
    .where(eq(communityComments.postId, postId));
  return Response.json({ comments });
}

export async function POST(req: Request) {
  const user = await requireUser(req);
  if (!isUser(user)) return user;
  try {
    const body = await req.json();
    const postId = String(body.postId || "").trim();
    const content = String(body.content || "").trim();
    if (!postId || !content) {
      return Response.json({ error: "postId and content required" }, { status: 400 });
    }
    const [post] = await db.select().from(communityPosts).where(eq(communityPosts.id, postId)).limit(1);
    if (!post) return Response.json({ error: "Post not found" }, { status: 404 });
    const id = generateId();
    await db.insert(communityComments).values({ id, postId, userId: user.id, content });
    await db
      .update(communityPosts)
      .set({ commentCount: (post.commentCount || 0) + 1 })
      .where(eq(communityPosts.id, postId));
    return Response.json({ id, message: "Comment added" });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Comment failed";
    return Response.json({ error: msg }, { status: 500 });
  }
}
