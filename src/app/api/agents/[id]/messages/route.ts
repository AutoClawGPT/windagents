import { db } from "@/db/client";
import { agentMessages } from "@/db/schema";
import { requireUser, isUser } from "@/lib/auth";
import { resolveOwnedAgent } from "@/lib/resolve-agent";
import { eq, desc } from "drizzle-orm";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(req: Request, ctx: Ctx) {
  const user = await requireUser(req);
  if (!isUser(user)) return user;
  const { id } = await ctx.params;
  const resolved = await resolveOwnedAgent(user, id);
  if (!resolved.ok) {
    return Response.json({ error: resolved.error, message: resolved.message }, { status: resolved.status });
  }
  const localId = resolved.canonicalId;

  const messages = await db
    .select()
    .from(agentMessages)
    .where(eq(agentMessages.agentId, localId))
    .orderBy(desc(agentMessages.createdAt))
    .limit(100);

  return Response.json({ agentId: localId, canonicalId: localId, messages: messages.reverse() });
}
