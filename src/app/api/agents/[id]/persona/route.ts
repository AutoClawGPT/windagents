import { db } from "@/db/client";
import { agents } from "@/db/schema";
import { requireUser, isUser } from "@/lib/auth";
import { extractClawpumpKey, clawpumpFetch } from "@/lib/clawpump";
import { resolveOwnedAgent } from "@/lib/resolve-agent";
import { eq, and } from "drizzle-orm";

type Ctx = { params: Promise<{ id: string }> };

const ARCHETYPES: Record<string, { label: string; persona: string }> = {
  "storm-scout": {
    label: "Storm Scout",
    persona:
      "You are Storm Scout — a WindAgents Solana meme-market scout. You hunt early liquidity, narrate risk in plain speech, prefer Jupiter routes with low impact, never invent balances, and treat PayBox/ClawPump keys as sacred. Voice: sharp, wind-cut, cyan energy. You tip your human when a signal is noise vs signal.",
  },
  "vault-keeper": {
    label: "Vault Keeper",
    persona:
      "You are Vault Keeper — a WindAgents non-custodial treasury agent. You obsess over spend limits, PayBox policies, and wallet hygiene. You refuse mock balances, require confirmations before transfers, and explain every signing request. Voice: calm, precise, amber caution lights when risk rises.",
  },
  "forge-trader": {
    label: "Forge Trader",
    persona:
      "You are Forge Trader — a WindAgents execution agent for meme-coin markets. You plan entries/exits, call real Jupiter quotes before acting, sync with ClawPump lifecycle, and never fake fills. Voice: competitive, clipped, ember-hot when volatility spikes — still disciplined.",
  },
};

function pickRemotePersona(remote: unknown): string | null {
  if (!remote || typeof remote !== "object") return null;
  const r = remote as Record<string, unknown>;
  const agent = (r.agent || r.data || r) as Record<string, unknown>;
  for (const key of ["persona", "systemPrompt", "system_prompt", "instructions", "prompt", "description"]) {
    const v = agent[key];
    if (typeof v === "string" && v.trim().length > 8) return v.trim();
  }
  return null;
}

export async function POST(req: Request, ctx: Ctx) {
  const user = await requireUser(req);
  if (!isUser(user)) return user;

  const { id } = await ctx.params;
  const resolved = await resolveOwnedAgent(user, id);
  if (!resolved.ok) {
    return Response.json({ error: resolved.error, message: resolved.message }, { status: resolved.status });
  }
  const row = resolved.row;
  const idLocal = resolved.canonicalId;

  const body = await req.json().catch(() => ({}));
  const mode = String(body.mode || "");

  let persona: string | null = null;
  let source = mode;
  let meta: Record<string, unknown> = {};

  if (mode === "clawpump-generate") {
    const cpk = extractClawpumpKey(user.encryptedKeys);
    if (!cpk) {
      return Response.json(
        {
          error: "connect_your_own_key",
          service: "ClawPump",
          message: "Save cpk_ in Settings to generate a live persona via ClawPump.",
        },
        { status: 401 }
      );
    }
    const skills = row.skills ? JSON.parse(row.skills) : [];
    const prompt = `Write a vivid agent PERSONA (120-220 words, first person "You are…") for a Solana meme-coin agent named "${row.name}". Skills: ${JSON.stringify(skills)}. Include trading style, risk rules, voice/tone, and WindAgents Aeolian Forge vibe. No markdown fences. Persona only.`;
    const target = row.clawpumpAgentId;
    if (!target) {
      return Response.json(
        { error: "no_clawpump_link", message: "Agent has no clawpumpAgentId yet — create/sync with cpk_ first." },
        { status: 400 }
      );
    }
    const res = await clawpumpFetch(`/agents/${target}/chat`, cpk, {
      method: "POST",
      body: JSON.stringify({ message: prompt }),
    });
    const text = await res.text();
    let parsed: unknown = text;
    try {
      parsed = JSON.parse(text);
    } catch {
      /* raw */
    }
    meta = { clawpumpStatus: res.status, raw: parsed };
    if (!res.ok) {
      return Response.json(
        { error: "clawpump_chat_failed", message: "ClawPump persona generate failed", meta },
        { status: 502 }
      );
    }
    const obj = parsed as Record<string, unknown>;
    persona = String(
      obj.reply || obj.message || obj.content || (obj.data as { content?: string })?.content || ""
    ).trim();
    if (!persona) {
      return Response.json({ error: "empty_persona", message: "ClawPump returned empty persona", meta }, { status: 502 });
    }
  } else if (mode === "clawpump-sync") {
    const cpk = extractClawpumpKey(user.encryptedKeys);
    if (!cpk) {
      return Response.json(
        {
          error: "connect_your_own_key",
          service: "ClawPump",
          message: "Save cpk_ in Settings to sync persona from ClawPump.",
        },
        { status: 401 }
      );
    }
    if (!row.clawpumpAgentId) {
      return Response.json(
        { error: "no_clawpump_link", message: "No linked ClawPump agent id on this profile." },
        { status: 400 }
      );
    }
    const res = await clawpumpFetch(`/agents/${row.clawpumpAgentId}`, cpk);
    const text = await res.text();
    let parsed: unknown = text;
    try {
      parsed = JSON.parse(text);
    } catch {
      /* raw */
    }
    meta = { clawpumpStatus: res.status, remote: parsed };
    if (!res.ok) {
      return Response.json(
        { error: "clawpump_get_failed", message: "Could not fetch ClawPump agent", meta },
        { status: 502 }
      );
    }
    persona = pickRemotePersona(parsed);
    if (!persona) {
      return Response.json(
        {
          error: "no_remote_persona",
          message: "ClawPump agent has no persona/systemPrompt field to sync.",
          meta,
        },
        { status: 404 }
      );
    }
  } else if (mode === "archetype") {
    const key = String(body.archetype || "storm-scout");
    const arch = ARCHETYPES[key] || ARCHETYPES["storm-scout"];
    persona = arch.persona;
    source = `archetype:${key}`;
    meta = { label: arch.label, options: Object.keys(ARCHETYPES) };
  } else {
    return Response.json(
      {
        error: "invalid_mode",
        message: "mode must be clawpump-generate | clawpump-sync | archetype",
        options: [
          { mode: "clawpump-generate", label: "Forge with ClawPump AI" },
          { mode: "clawpump-sync", label: "Pull from ClawPump profile" },
          {
            mode: "archetype",
            label: "Apply WindAgents archetype",
            archetypes: Object.entries(ARCHETYPES).map(([id, v]) => ({ id, label: v.label })),
          },
        ],
      },
      { status: 400 }
    );
  }

  const now = new Date().toISOString();
  await db
    .update(agents)
    .set({ persona, updatedAt: now })
    .where(and(eq(agents.id, idLocal), eq(agents.userId, user.id)));

  // Best-effort push persona upstream to ClawPump
  const cpk = extractClawpumpKey(user.encryptedKeys);
  if (cpk && row.clawpumpAgentId && persona) {
    try {
      const res = await clawpumpFetch(`/agents/${row.clawpumpAgentId}`, cpk, {
        method: "PATCH",
        body: JSON.stringify({ persona }),
      });
      meta.clawpumpPatch = res.status;
    } catch (e: unknown) {
      meta.clawpumpPatchError = e instanceof Error ? e.message : "patch failed";
    }
  }

  const [updated] = await db.select().from(agents).where(eq(agents.id, idLocal)).limit(1);
  return Response.json({
    ok: true,
    source,
    persona,
    agent: {
      ...updated,
      skills: updated?.skills ? JSON.parse(updated.skills) : [],
    },
    meta,
  });
}

export async function GET(req: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  const user = await requireUser(req);
  let current: string | null = null;
  let canonicalId = id;
  if (isUser(user)) {
    const resolved = await resolveOwnedAgent(user, id);
    if (resolved.ok) {
      current = resolved.row.persona ?? null;
      canonicalId = resolved.canonicalId;
    }
  }
  return Response.json({
    agentId: canonicalId,
    canonicalId,
    persona: current,
    options: [
      {
        mode: "clawpump-generate",
        label: "Forge with ClawPump AI",
        needs: "cpk_ + linked clawpumpAgentId",
      },
      {
        mode: "clawpump-sync",
        label: "Pull from ClawPump profile",
        needs: "cpk_ + linked clawpumpAgentId",
      },
      {
        mode: "archetype",
        label: "Apply WindAgents archetype",
        archetypes: Object.entries(ARCHETYPES).map(([id, v]) => ({ id, label: v.label })),
      },
    ],
  });
}
