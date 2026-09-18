import { db } from "@/db/client";
import { rewardSubmissions } from "@/db/schema";
import { requireUser, isUser } from "@/lib/auth";
import { eq } from "drizzle-orm";

export async function GET(req: Request) {
  const user = await requireUser(req);
  if (!isUser(user)) return user;
  const rows = await db
    .select()
    .from(rewardSubmissions)
    .where(eq(rewardSubmissions.userId, user.id));
  return Response.json({ submissions: rows });
}
