import { requireUser, isUser } from "@/lib/auth";
import { requireCpk, proxyClawpumpPlatformJson } from "@/lib/clawpump-launch";

/**
 * GET /api/fees/earnings?agentId= — platform GET /api/fees/earnings (not Partner v1).
 * Honest errors if upstream missing. Per-user cpk_ only.
 */
export async function GET(req: Request) {
  const user = await requireUser(req);
  if (!isUser(user)) return user;
  const gate = requireCpk(user);
  if (!gate.ok) return gate.response;

  const agentId = new URL(req.url).searchParams.get("agentId") || "";
  if (!agentId) {
    return Response.json(
      {
        error: "agentId_required",
        message: "GET /api/fees/earnings?agentId=…",
        note: "Platform fees surface (clawpump.tech/api), not Partner /api/v1.",
      },
      { status: 400 }
    );
  }

  return proxyClawpumpPlatformJson(
    gate.cpk,
    `/fees/earnings?agentId=${encodeURIComponent(agentId)}`,
    { method: "GET" }
  );
}
