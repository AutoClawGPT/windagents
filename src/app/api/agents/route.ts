import { db } from "@/db/client";
import { agents } from "@/db/schema";
import { requireUser, isUser } from "@/lib/auth";
import { generateId } from "@/lib/crypto";
import { extractClawpumpKey, clawpumpFetch, clawpumpInfo } from "@/lib/clawpump";
import { eq } from "drizzle-orm";

export async function GET(req: Request) {
  const user = await requireUser(req);
  if (!isUser(user)) return user;

  const local = await db.select().from(agents).where(eq(agents.userId, user.id));
  const cpk = extractClawpumpKey(user.encryptedKeys);

  let remote: unknown = null;
  let clawpumpError: string | null = null;
  if (cpk) {
    try {
      const res = await clawpumpFetch("/agents", cpk);
      const text = await res.text();
      try {
        remote = JSON.parse(text);
      } catch {
        remote = { raw: text, status: res.status };
      }
      if (!res.ok) clawpumpError = `ClawPump responded ${res.status}`;
    } catch (e: unknown) {
      clawpumpError = e instanceof Error ? e.message : "ClawPump unreachable";
    }
  }

  return Response.json({
    agents: local.map((a) => ({
      ...a,
      skills: a.skills ? JSON.parse(a.skills) : [],
    })),
    clawpump: cpk
      ? { connected: true, remote, error: clawpumpError }
      : {
          connected: false,
          error: "connect_your_own_key",
          message: "Save a cpk_ ClawPump API key in Settings to list/proxy live ClawPump agents.",
          info: clawpumpInfo(),
        },
  });
}

export async function POST(req: Request) {
  const user = await requireUser(req);
  if (!isUser(user)) return user;

  try {
    const body = await req.json();
    const name = String(body.name || "").trim();
    if (!name) return Response.json({ error: "name required" }, { status: 400 });

    const persona = body.persona ? String(body.persona) : null;
    const model = body.model ? String(body.model) : "moonshotai/kimi-k2.5";
    const skillsArr: string[] = Array.isArray(body.skills) ? body.skills.map(String) : [];
    const avatarPrompt = body.avatarPrompt ? String(body.avatarPrompt).slice(0, 1000) : null;
    const avatarGlbUrl = body.avatarGlbUrl ? String(body.avatarGlbUrl).trim() : null;
    const id = generateId();

    let clawpumpAgentId: string | null = null;
    const cpk = extractClawpumpKey(user.encryptedKeys);
    let clawpump: unknown = null;

    if (cpk) {
      try {
        const res = await clawpumpFetch("/agents", cpk, {
          method: "POST",
          body: JSON.stringify({ name, persona, model, skills: skillsArr }),
        });
        const text = await res.text();
        try {
          clawpump = JSON.parse(text);
        } catch {
          clawpump = { raw: text, status: res.status };
        }
        if (res.ok && clawpump && typeof clawpump === "object") {
          clawpumpAgentId =
            (clawpump as { id?: string; agentId?: string }).id ||
            (clawpump as { agentId?: string }).agentId ||
            null;
        }
      } catch (e: unknown) {
        clawpump = {
          error: e instanceof Error ? e.message : "ClawPump create failed",
        };
      }
    }

    await db.insert(agents).values({
      id,
      userId: user.id,
      clawpumpAgentId,
      name,
      persona,
      model,
      skills: JSON.stringify(skillsArr),
      status: "stopped",
      isPublic: body.isPublic !== false,
      avatarPrompt,
      avatarGlbUrl: avatarGlbUrl || null,
    });

    return Response.json({
      agent: {
        id,
        name,
        persona,
        model,
        skills: skillsArr,
        clawpumpAgentId,
        status: "stopped",
        avatarPrompt,
        avatarGlbUrl: avatarGlbUrl || null,
      },
      clawpump: cpk
        ? { connected: true, response: clawpump }
        : {
            connected: false,
            error: "connect_your_own_key",
            message:
              "Local agent record created. Connect cpk_ in Settings to sync with ClawPump.",
          },
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Create failed";
    return Response.json({ error: msg }, { status: 500 });
  }
}
