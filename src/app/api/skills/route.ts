import { db } from "@/db/client";
import { skills } from "@/db/schema";
import { requireUser, isUser } from "@/lib/auth";
import { generateId } from "@/lib/crypto";
import { extractClawpumpKey } from "@/lib/clawpump";
import {
  CLAWPUMP_PUBLIC_SKILLS,
  CLAWPUMP_DOCS_EXTRA_SKILLS,
  THREE_WS_PUMP_FUN_SKILLS,
  WINDAGENTS_PLATFORM_SKILLS,
  fetchClawpumpSkillsCatalog,
  enableClawpumpAgentSkills,
} from "@/lib/clawpump-skills";
import { resolveClawpumpAgentId } from "@/lib/clawpump-launch";
import { connectKeyError } from "@/lib/utils";
import { eq } from "drizzle-orm";

export async function GET(req: Request) {
  const auth = req.headers.get("authorization");
  let userSkills: (typeof skills.$inferSelect)[] = [];
  let clawpump: {
    connected: boolean;
    skills: typeof CLAWPUMP_PUBLIC_SKILLS;
    live: boolean;
    error: string | null;
    message?: string;
    installHint: string;
  } = {
    connected: false,
    skills: CLAWPUMP_PUBLIC_SKILLS.map((s) => ({ ...s, source: "clawpump-seed" })),
    live: false,
    error: null,
    message: "Save cpk_ in Settings to pull the live ClawPump Partner catalogue",
    installHint:
      "Enable skills on a ClawPump agent via POST /api/skills { action:\"enable\", agentId, skills:[...] } or clawpump.tech dashboard",
  };

  if (auth?.startsWith("Bearer ")) {
    const user = await requireUser(req);
    if (isUser(user)) {
      userSkills = await db.select().from(skills).where(eq(skills.userId, user.id));
      const cpk = extractClawpumpKey(user.encryptedKeys);
      if (cpk) {
        const live = await fetchClawpumpSkillsCatalog(cpk);
        clawpump = {
          connected: true,
          skills: (live.ok ? live.skills : CLAWPUMP_PUBLIC_SKILLS).map((s) => ({
            ...s,
            source: live.ok ? "clawpump" : "clawpump-seed",
          })),
          live: live.ok,
          error: live.ok ? null : live.error || "upstream_error",
          message: live.ok
            ? `Live ClawPump Partner catalogue (${live.skills.length} skills)`
            : `cpk_ connected but GET /skills failed — showing seed. ${live.error || ""}`,
          installHint: clawpump.installHint,
        };
      }
    }
  } else {
    userSkills = await db.select().from(skills).limit(50);
  }

  // builtin = Partner public seed + WindAgents platform helpers
  const builtin = [
    ...CLAWPUMP_PUBLIC_SKILLS.map((s) => ({
      ...s,
      source: "clawpump-seed",
    })),
    ...WINDAGENTS_PLATFORM_SKILLS.map((s) => ({
      ...s,
      source: s.source || "windagents",
    })),
  ];

  return Response.json({
    builtin,
    skills: userSkills.map((s) => ({
      ...s,
      tags: s.tags ? JSON.parse(s.tags) : [],
    })),
    clawpump,
    /** Docs marketing extras — not Partner enable slugs unless live catalogue includes them */
    clawpumpDocsExtra: CLAWPUMP_DOCS_EXTRA_SKILLS,
    /** three.ws pump-fun-skills — install/docs pointers only */
    threeWs: {
      skills: THREE_WS_PUMP_FUN_SKILLS,
      note: "Install SKILL.md packs into your agent runtime. WindAgents Launch/Tokenize uses ClawPump Partner — these packs are additive documentation.",
      npm: ["@three-ws/solana-agent@0.2.2", "@three-ws/walk@0.3.1", "@three-ws/agent-payments"],
      phase2Missing: [
        "character-studio (full fork)",
        "walk-sdk companion embed",
        "MediaPipe / viseme lipsync",
        "reactive PumpPortal → Agent3D wiring",
        "@three-ws/solana-agent runtime dependency",
      ],
    },
    meta: {
      partnerPublicSlugs: CLAWPUMP_PUBLIC_SKILLS.map((s) => s.slug),
      clawpumpDocsUrl: "https://clawpump.tech/docs",
      mcpNotes: {
        agentMcpTools: "~122–126 via @clawpump/agents stdio (cpk_)",
        launchpadMcpTools: 78,
        oauthHost: "https://mcp.clawpump.tech (OAuth-only — rejects cpk_)",
        windagentsProxy: "/api/clawpump/mcp (unchanged)",
      },
      perUserKeysOnly: true,
    },
  });
}

export async function POST(req: Request) {
  const user = await requireUser(req);
  if (!isUser(user)) return user;

  try {
    const body = await req.json();
    const action = String(body.action || "save").trim();

    // Enable / replace ClawPump agent skill slugs via Partner API
    if (action === "enable") {
      const cpk = extractClawpumpKey(user.encryptedKeys);
      if (!cpk) {
        return connectKeyError(
          "ClawPump",
          "PUT /api/settings { clawpumpApiKey: 'cpk_...' } — required to enable skills on a ClawPump agent"
        );
      }
      const agentId = String(body.agentId || "").trim();
      if (!agentId) {
        return Response.json({ error: "agentId required" }, { status: 400 });
      }
      const skillSlugs = Array.isArray(body.skills)
        ? body.skills.map(String).filter(Boolean)
        : body.slug
          ? [String(body.slug)]
          : [];
      if (!skillSlugs.length) {
        return Response.json(
          { error: "skills array (or slug) required — Partner public slugs e.g. trading, token-launch" },
          { status: 400 }
        );
      }
      // Refuse three.ws / docs-only slugs that are not Partner-enableable
      const blocked = skillSlugs.filter(
        (s: string) =>
          s.startsWith("threews-") ||
          CLAWPUMP_DOCS_EXTRA_SKILLS.some((d) => d.slug === s && d.enableable === false)
      );
      if (blocked.length) {
        return Response.json(
          {
            error: "not_partner_enableable",
            blocked,
            message:
              "Install three.ws / docs pointer packs via their installUrl SKILL.md — Partner enable only accepts public Partner slugs (trading, perps, …).",
            partnerPublicSlugs: CLAWPUMP_PUBLIC_SKILLS.map((s) => s.slug),
          },
          { status: 400 }
        );
      }
      const resolved = await resolveClawpumpAgentId(user.id, agentId);
      const clawId = resolved.clawpumpAgentId;
      if (!clawId) {
        return Response.json(
          {
            error: "clawpump_agent_required",
            message:
              "Enable needs a ClawPump agent id (or a local agent linked via clawpumpAgentId). Create/sync an agent with cpk_ first.",
          },
          { status: 400 }
        );
      }
      const result = await enableClawpumpAgentSkills(cpk, clawId, skillSlugs);
      if (!result.ok) {
        return Response.json(
          {
            error: "upstream_error",
            upstreamStatus: result.status,
            message: `ClawPump POST /agents/${clawId} returned ${result.status}`,
            upstream: result.data,
            installHint:
              "If update is rejected, enable the skill in the ClawPump dashboard or recreate the agent with skills:[…]",
          },
          { status: result.status >= 400 && result.status < 600 ? result.status : 502 }
        );
      }
      return Response.json({
        ok: true,
        action: "enable",
        agentId: clawId,
        skills: skillSlugs,
        upstream: result.data,
        message: "Skills sent to ClawPump agent (Partner POST /agents/:id)",
      });
    }

    const name = String(body.name || "").trim();
    const slug =
      String(body.slug || name.toLowerCase().replace(/[^a-z0-9]+/g, "-")).trim() ||
      generateId();
    if (!name) return Response.json({ error: "name required" }, { status: 400 });

    const id = generateId();
    await db.insert(skills).values({
      id,
      name,
      slug,
      description: body.description ? String(body.description) : null,
      source: body.source ? String(body.source) : "user",
      skillMdContent: body.skillMdContent ? String(body.skillMdContent) : null,
      tags: JSON.stringify(Array.isArray(body.tags) ? body.tags : []),
      installed: !!body.installed,
      userId: user.id,
    });

    return Response.json({ id, name, slug, message: "Skill saved" });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Save failed";
    return Response.json({ error: msg }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  const user = await requireUser(req);
  if (!isUser(user)) return user;
  const url = new URL(req.url);
  const id = url.searchParams.get("id");
  if (!id) return Response.json({ error: "id query required" }, { status: 400 });
  const [row] = await db.select().from(skills).where(eq(skills.id, id)).limit(1);
  if (!row) return Response.json({ error: "Not found" }, { status: 404 });
  if (row.userId !== user.id) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }
  await db.delete(skills).where(eq(skills.id, id));
  return Response.json({ ok: true, id, message: "Skill deleted" });
}
