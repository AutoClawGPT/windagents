import { requireUser, isUser } from "@/lib/auth";
import {
  requireCpk,
  proxyClawpumpJson,
  proxyClawpumpPlatformJson,
  resolveClawpumpAgentId,
  launchPollUnavailable,
} from "@/lib/clawpump-launch";

type Ctx = { params: Promise<{ id: string }> };

/** Alias poll path: GET /api/agents/:id/pons/launches → ClawPump (platform + v1) */
export async function GET(req: Request, ctx: Ctx) {
  const user = await requireUser(req);
  if (!isUser(user)) return user;
  const cpkResult = requireCpk(user);
  if (!cpkResult.ok) return cpkResult.response;

  const { id } = await ctx.params;
  const launchId = new URL(req.url).searchParams.get("launchId") || new URL(req.url).searchParams.get("id") || "";
  const resolved = await resolveClawpumpAgentId(user.id, id);
  const target = resolved.clawpumpAgentId || (!resolved.localId ? id : null);
  if (!target) {
    return Response.json(
      {
        error: "no_clawpump_link",
        message: "Agent not linked to ClawPump — pass ClawPump agent id or sync with cpk_.",
      },
      { status: 400 }
    );
  }

  const tried: string[] = [];

  if (launchId) {
    for (const [label, fn, path] of [
      ["platform", proxyClawpumpPlatformJson, `/agents/${target}/pons/launches/${launchId}`],
      ["v1", proxyClawpumpJson, `/agents/${target}/pons/launches/${launchId}`],
    ] as const) {
      tried.push(`GET ${label} ${path}`);
      const res = await fn(cpkResult.cpk, path, { method: "GET" });
      if (res.status !== 404 && res.status !== 405 && res.status !== 502) return res;
    }
  }

  for (const [label, fn, path] of [
    ["platform", proxyClawpumpPlatformJson, `/agents/${target}/pons/launches`],
    ["v1", proxyClawpumpJson, `/agents/${target}/pons/launches`],
  ] as const) {
    tried.push(`GET ${label} ${path}`);
    const res = await fn(cpkResult.cpk, path, { method: "GET" });
    if (res.status !== 404 && res.status !== 405 && res.status !== 502) return res;
  }

  tried.push(`GET v1 /agents/${target}`);
  const agentRes = await proxyClawpumpJson(cpkResult.cpk, `/agents/${target}`, { method: "GET" });
  if (agentRes.ok) {
    try {
      const data = await agentRes.clone().json();
      return Response.json(
        {
          success: true,
          launches: [],
          agent: data,
          windagents: {
            note: "PONS launches list unavailable upstream — returning agent record.",
            tried,
          },
        },
        { status: 200 }
      );
    } catch {
      return agentRes;
    }
  }

  return launchPollUnavailable("pons", tried);
}
