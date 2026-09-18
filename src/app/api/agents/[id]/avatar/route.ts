import { db } from "@/db/client";
import { agents } from "@/db/schema";
import { requireUser, isUser } from "@/lib/auth";
import { buildAvatarPrompt, forgeAvatarViaThreeWs, DEFAULT_AVATAR_GLB } from "@/lib/three-ws";
import { eq, and } from "drizzle-orm";

type Ctx = { params: Promise<{ id: string }> };

type AvatarBody = {
  prompt?: string;
  avatarPrompt?: string;
  avatarGlbUrl?: string;
  avatarUrl?: string;
  forge?: boolean;
};

async function handleAvatar(req: Request, ctx: Ctx) {
  const user = await requireUser(req);
  if (!isUser(user)) return user;
  const { id } = await ctx.params;

  const [agent] = await db
    .select()
    .from(agents)
    .where(and(eq(agents.id, id), eq(agents.userId, user.id)))
    .limit(1);
  if (!agent) return Response.json({ error: "Agent not found" }, { status: 404 });

  let body: AvatarBody = {};
  try {
    body = await req.json();
  } catch {
    /* empty ok */
  }

  const directGlb = (body.avatarGlbUrl || body.avatarUrl || "").trim();
  const prompt =
    (body.prompt || body.avatarPrompt || agent.avatarPrompt || "").trim() ||
    buildAvatarPrompt(agent.name, agent.persona);

  // Direct set (no forge) when GLB URL provided and forge not forced
  if (directGlb && body.forge !== true) {
    await db
      .update(agents)
      .set({
        avatarGlbUrl: directGlb,
        avatarPrompt: prompt || agent.avatarPrompt,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(agents.id, id));
    return Response.json({
      ok: true,
      avatarGlbUrl: directGlb,
      avatarPrompt: prompt || agent.avatarPrompt,
      agentId: id,
      mode: "direct",
    });
  }

  await db
    .update(agents)
    .set({ avatarPrompt: prompt, updatedAt: new Date().toISOString() })
    .where(eq(agents.id, id));

  const forged = await forgeAvatarViaThreeWs(prompt, { timeoutMs: 120_000 });

  if (!forged.ok) {
    return Response.json(
      {
        ok: false,
        error: "forge_failed",
        message: forged.error,
        avatarGlbUrl: agent.avatarGlbUrl || DEFAULT_AVATAR_GLB,
        avatarPrompt: prompt,
        usingDefault: true,
      },
      { status: 502 }
    );
  }

  await db
    .update(agents)
    .set({
      avatarGlbUrl: forged.glbUrl,
      avatarPrompt: prompt,
      updatedAt: new Date().toISOString(),
    })
    .where(eq(agents.id, id));

  return Response.json({
    ok: true,
    avatarGlbUrl: forged.glbUrl,
    avatarPrompt: prompt,
    agentId: id,
    mode: "forge",
  });
}

export async function POST(req: Request, ctx: Ctx) {
  return handleAvatar(req, ctx);
}

export async function PUT(req: Request, ctx: Ctx) {
  return handleAvatar(req, ctx);
}
