import { db } from "@/db/client";
import { agents } from "@/db/schema";
import { requireUser, isUser } from "@/lib/auth";
import { extractClawpumpKey, clawpumpFetch } from "@/lib/clawpump";
import { resolveOwnedAgent } from "@/lib/resolve-agent";
import { eq } from "drizzle-orm";

type Ctx = { params: Promise<{ id: string }> };

export async function POST(req: Request, ctx: Ctx) {
  const user = await requireUser(req);
  if (!isUser(user)) return user;
  const { id } = await ctx.params;
  const resolved = await resolveOwnedAgent(user, id);
  if (!resolved.ok) {
    return Response.json({ error: resolved.error, message: resolved.message }, { status: resolved.status });
  }
  const agent = resolved.row;
  const localId = resolved.canonicalId;

  const cpk = extractClawpumpKey(user.encryptedKeys);
  let remote: unknown = null;
  const remoteId = agent.clawpumpAgentId || null;
  if (cpk && remoteId) {
    try {
      const res = await clawpumpFetch(`/agents/${remoteId}/start`, cpk, {
        method: "POST",
        body: "{}",
      });
      remote = await res.json().catch(async () => ({ status: res.status, raw: await res.text() }));
    } catch (e: unknown) {
      remote = { error: e instanceof Error ? e.message : "start failed" };
    }
  } else if (!cpk) {
    return Response.json(
      {
        error: "connect_your_own_key",
        service: "ClawPump",
        message: "Save cpk_ in Settings to start agents on ClawPump. Local status not faked without key.",
      },
      { status: 401 }
    );
  }

  await db
    .update(agents)
    .set({ status: "running", updatedAt: new Date().toISOString() })
    .where(eq(agents.id, localId));

  return Response.json({ ok: true, agentId: localId, status: "running", clawpump: remote, canonicalId: localId });
}
