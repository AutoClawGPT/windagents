import { db } from "@/db/client";
import { agentMessages } from "@/db/schema";
import { requireUser, isUser } from "@/lib/auth";
import { generateId } from "@/lib/crypto";
import { extractClawpumpKey, clawpumpFetch } from "@/lib/clawpump";
import { resolveOwnedAgent } from "@/lib/resolve-agent";

export async function POST(req: Request) {
  const user = await requireUser(req);
  if (!isUser(user)) return user;

  try {
    const body = await req.json();
    const agentId = String(body.agentId || "").trim();
    const message = String(body.message || "").trim();
    if (!agentId || !message) {
      return Response.json({ error: "agentId and message required" }, { status: 400 });
    }

    const resolved = await resolveOwnedAgent(user, agentId);
    if (!resolved.ok) {
      return Response.json({ error: resolved.error, message: resolved.message }, { status: resolved.status });
    }
    const agent = resolved.row;
    const localId = resolved.canonicalId;

    await db.insert(agentMessages).values({
      id: generateId(),
      agentId: localId,
      role: "user",
      content: message,
    });

    const cpk = extractClawpumpKey(user.encryptedKeys);
    if (!cpk) {
      return Response.json(
        {
          error: "connect_your_own_key",
          service: "ClawPump",
          message:
            "Chat requires a ClawPump cpk_ API key in Settings. WindAgents does not mock LLM replies.",
          storedUserMessage: true,
        },
        { status: 401 }
      );
    }

    const remoteId = agent.clawpumpAgentId || localId;
    let reply: string | null = null;
    let remote: unknown = null;
    try {
      const res = await clawpumpFetch(`/agents/${remoteId}/chat`, cpk, {
        method: "POST",
        body: JSON.stringify({ message }),
      });
      const text = await res.text();
      try {
        remote = JSON.parse(text);
      } catch {
        remote = { raw: text, status: res.status };
      }
      if (remote && typeof remote === "object") {
        reply =
          (remote as { reply?: string; message?: string; content?: string }).reply ||
          (remote as { message?: string }).message ||
          (remote as { content?: string }).content ||
          null;
      }
      if (!res.ok) {
        return Response.json(
          {
            error: "clawpump_chat_failed",
            status: res.status,
            clawpump: remote,
          },
          { status: 502 }
        );
      }
    } catch (e: unknown) {
      return Response.json(
        {
          error: "clawpump_unreachable",
          message: e instanceof Error ? e.message : "fetch failed",
        },
        { status: 502 }
      );
    }

    if (reply) {
      await db.insert(agentMessages).values({
        id: generateId(),
        agentId: localId,
        role: "assistant",
        content: reply,
      });
    }

    return Response.json({ agentId: localId, reply, clawpump: remote, canonicalId: localId });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Chat failed";
    return Response.json({ error: msg }, { status: 500 });
  }
}
