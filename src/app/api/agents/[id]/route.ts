import { db } from "@/db/client";
import { agents, users } from "@/db/schema";
import { requireUser, isUser, getBearerUser } from "@/lib/auth";
import { resolveOwnedAgent, resolveAgentForViewer } from "@/lib/resolve-agent";
import { eq } from "drizzle-orm";
import { registryDeleteAgent, registryDeleteUser } from "@/lib/registry-upstash";

type Ctx = { params: Promise<{ id: string }> };

function serialize(agent: typeof agents.$inferSelect) {
  return {
    ...agent,
    skills: agent.skills ? JSON.parse(agent.skills) : [],
  };
}

export async function GET(req: Request, ctx: Ctx) {
  const viewer = await getBearerUser(req);
  const { id } = await ctx.params;
  const resolved = await resolveAgentForViewer(viewer, id);
  if (!resolved.ok) {
    return Response.json(
      { error: resolved.error, message: "message" in resolved ? (resolved as { message?: string }).message : undefined, clawpump: (resolved as { clawpump?: unknown }).clawpump },
      { status: resolved.status }
    );
  }
  const serialized = serialize(resolved.row);
  return Response.json({
    agent: serialized,
    ...serialized,
    canonicalId: resolved.canonicalId,
    source: resolved.source,
    importedFrom: "importedFrom" in resolved ? resolved.importedFrom : undefined,
    owner: resolved.owner,
    createdAt: resolved.createdAt,
    reputation: resolved.reputation,
    wallet: resolved.wallet,
    communityPosts: resolved.communityPosts,
    stats: resolved.stats,
    flags: resolved.flags,
  });
}

export async function PATCH(req: Request, ctx: Ctx) {
  const user = await requireUser(req);
  if (!isUser(user)) return user;
  const { id } = await ctx.params;
  const resolved = await resolveOwnedAgent(user, id);
  if (!resolved.ok) {
    return Response.json({ error: resolved.error, message: resolved.message }, { status: resolved.status });
  }
  const localId = resolved.canonicalId;

  try {
    const body = await req.json();
    const patch: Partial<typeof agents.$inferInsert> = {
      updatedAt: new Date().toISOString(),
    };

    if (typeof body.name === "string" && body.name.trim()) patch.name = body.name.trim();
    if (typeof body.persona === "string") patch.persona = body.persona;
    if (typeof body.avatarGlbUrl === "string") {
      const url = body.avatarGlbUrl.trim();
      if (url && !/^https?:\/\//i.test(url)) {
        return Response.json({ error: "avatarGlbUrl must be http(s)" }, { status: 400 });
      }
      patch.avatarGlbUrl = url || null;
    }
    if (typeof body.avatarPrompt === "string") {
      patch.avatarPrompt = body.avatarPrompt.slice(0, 1000) || null;
    }
    if (Array.isArray(body.skills)) {
      patch.skills = JSON.stringify(body.skills.map(String));
    }
    if (typeof body.isPublic === "boolean") patch.isPublic = body.isPublic;

    await db.update(agents).set(patch).where(eq(agents.id, localId));
    const [updated] = await db.select().from(agents).where(eq(agents.id, localId)).limit(1);
    return Response.json({ agent: serialize(updated!), ok: true, canonicalId: localId });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Update failed";
    return Response.json({ error: msg }, { status: 500 });
  }
}

export async function DELETE(req: Request, ctx: Ctx) {
  const user = await requireUser(req);
  if (!isUser(user)) return user;
  const { id } = await ctx.params;
  const resolved = await resolveOwnedAgent(user, id);
  if (!resolved.ok) {
    return Response.json({ error: resolved.error }, { status: resolved.status });
  }
  await db.delete(agents).where(eq(agents.id, resolved.canonicalId));
  // skill.md agents: identity row id === userId — purge durable registry too
  try {
    await registryDeleteAgent(resolved.canonicalId);
    if (user.type === "agent" && (resolved.canonicalId === user.id || id === user.id)) {
      await db.delete(users).where(eq(users.id, user.id));
      await registryDeleteUser(user.id);
    }
  } catch (err) {
    console.error("[agents/delete] registry purge failed", err);
  }
  return Response.json({ ok: true, deleted: resolved.canonicalId });
}
