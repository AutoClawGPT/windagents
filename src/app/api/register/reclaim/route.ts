import { ensureDb, assertDurableDatabase, getDatabaseMode, isDurableDatabase } from "@/db/client";
import { requireUser, isUser } from "@/lib/auth";
import { ensurePublicAgentRow } from "@/lib/ensure-agent-profile";

/**
 * POST /api/register/reclaim
 * Bearer wa1.* — re-upsert user + public agents row after ephemeral /tmp loss.
 * Same agentId as in the token (claims.sub). No new token issued.
 */
export async function POST(req: Request) {
  await ensureDb();
  const ephemeral = assertDurableDatabase();
  if (ephemeral) return ephemeral;

  const user = await requireUser(req);
  if (!isUser(user)) return user;

  if (user.type === "agent") {
    await ensurePublicAgentRow({
      userId: user.id,
      name: user.displayName || "Agent",
    });
  }

  return Response.json({
    ok: true,
    agentId: user.id,
    type: user.type,
    name: user.displayName,
    profileUrl: user.type === "agent" ? `/agents/${user.id}` : null,
    dbMode: getDatabaseMode(),
    durable: isDurableDatabase(),
    message:
      user.type === "agent"
        ? "Public agent profile reclaimed from Bearer token. Open profileUrl."
        : "Human user row present.",
  });
}
