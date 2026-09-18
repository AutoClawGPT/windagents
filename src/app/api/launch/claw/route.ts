import { requireUser, isUser } from "@/lib/auth";
import {
  requireCpk,
  proxyClawpumpJson,
  resolveClawpumpAgentId,
  launchPollUnavailable,
} from "@/lib/clawpump-launch";

/**
 * WindAgents claw venue → ClawPump Partner API POST /launch
 * (legacy /launch/claw and /launch/pump are 404; gasless is retired — payment may be required).
 * Never fake success. No paid launches in audit/smoke.
 */
export async function GET(req: Request) {
  const user = await requireUser(req);
  if (!isUser(user)) return user;
  const cpkResult = requireCpk(user);
  if (!cpkResult.ok) return cpkResult.response;

  const agentId = new URL(req.url).searchParams.get("agentId") || "";
  if (!agentId) {
    return Response.json(
      {
        error: "agentId_required",
        message: "GET /api/launch/claw?agentId=…",
        note: "Claw venue proxies Partner POST /launch. Poll falls back to GET /agents/{id} tokenAddress when list endpoints are missing.",
      },
      { status: 400 }
    );
  }

  const resolved = await resolveClawpumpAgentId(user.id, agentId);
  const target = resolved.clawpumpAgentId || agentId;
  const tried: string[] = [];

  // Agent record includes tokenAddress when a token is linked
  tried.push(`GET /agents/${target}`);
  const agentRes = await proxyClawpumpJson(cpkResult.cpk, `/agents/${target}`, { method: "GET" });
  if (agentRes.ok) {
    try {
      const data = await agentRes.clone().json();
      return Response.json(
        {
          ...data,
          windagents: {
            note: "No dedicated claw launches list on Partner API — returning GET /agents/{id} (tokenAddress when linked).",
            pollHint: "POST /api/launch or /api/launch/claw → payment_required or launched; then GET this endpoint.",
          },
        },
        { status: 200 }
      );
    } catch {
      return agentRes;
    }
  }

  for (const path of [`/agents/${target}/launches`, `/launch?agentId=${encodeURIComponent(target)}`]) {
    tried.push(`GET ${path}`);
    const res = await proxyClawpumpJson(cpkResult.cpk, path, { method: "GET" });
    if (res.status !== 404 && res.status !== 405 && res.status !== 502) return res;
  }

  return launchPollUnavailable("claw", tried);
}

export async function POST(req: Request) {
  const user = await requireUser(req);
  if (!isUser(user)) return user;
  const cpkResult = requireCpk(user);
  if (!cpkResult.ok) return cpkResult.response;

  let body: Record<string, unknown> = {};
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "invalid_json" }, { status: 400 });
  }

  const agentId = String(body.agentId || "").trim();
  const name = String(body.name || "").trim();
  const symbol = String(body.symbol || body.ticker || "").trim();
  const description = String(body.description || "").trim();
  const mode = String(body.mode || "gasless");

  if (!agentId || !name || !symbol) {
    return Response.json(
      { error: "missing_fields", message: "agentId, name, and symbol are required" },
      { status: 400 }
    );
  }

  const resolved = await resolveClawpumpAgentId(user.id, agentId);
  if (resolved.localId && !resolved.clawpumpAgentId) {
    return Response.json(
      {
        error: "no_clawpump_link",
        message:
          "Local agent has no clawpumpAgentId — connect cpk_ and create/sync, or pass ClawPump agentId.",
      },
      { status: 400 }
    );
  }
  const target = resolved.clawpumpAgentId || agentId;

  // Partner API: POST /launch (not /launch/claw — that 404s)
  const payload: Record<string, unknown> = {
    agentId: target,
    name,
    symbol,
    description: description || `${name} launched via WindAgents`,
    selfFunded: body.selfFunded === true || mode === "paid",
  };
  const imageUrl = body.logoUrl || body.imageUrl || body.image_url;
  if (imageUrl) payload.imageUrl = String(imageUrl);
  if (body.payoutWallet) payload.payoutWallet = String(body.payoutWallet);
  else if (user.payoutWallet) payload.payoutWallet = user.payoutWallet;
  if (body.pumpQuoteMint) payload.pumpQuoteMint = String(body.pumpQuoteMint);
  if (body.pumpCreatorFeeBps != null) payload.pumpCreatorFeeBps = body.pumpCreatorFeeBps;
  if (body.initialBuySol != null) payload.initialBuySol = body.initialBuySol;

  const last = await proxyClawpumpJson(cpkResult.cpk, "/launch", {
    method: "POST",
    body: JSON.stringify(payload),
  });

  try {
    const data = await last.clone().json();
    if (typeof data === "object" && data !== null) {
      return Response.json(
        {
          ...data,
          windagents: {
            note: "Claw venue → ClawPump Partner POST /launch. Legacy /launch/claw paths are 404. LAUNCH_PAYMENT_REQUIRED / selfFunded / 402 returned honestly — WindAgents never fakes a mint.",
            mode,
            upstreamPath: "/launch",
            poll: `/api/launch/claw?agentId=${encodeURIComponent(target)}`,
          },
        },
        { status: last.status }
      );
    }
  } catch {
    return last;
  }
  return last;
}
