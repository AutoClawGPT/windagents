import { requireUser, isUser } from "@/lib/auth";
import {
  requireCpk,
  proxyClawpumpJson,
  proxyClawpumpPlatformJson,
  resolveClawpumpAgentId,
  launchPollUnavailable,
} from "@/lib/clawpump-launch";

/**
 * WindAgents-native PONS launch → ClawPump POST /launch/pons
 * Poll: docs say GET /api/agents/{agentId}/pons/launches/{id} (platform /api, not always on /api/v1).
 * Unpaid → pass through 401/402 with pay — never fake success.
 */
export async function GET(req: Request) {
  const user = await requireUser(req);
  if (!isUser(user)) return user;
  const cpkResult = requireCpk(user);
  if (!cpkResult.ok) return cpkResult.response;

  const url = new URL(req.url);
  const agentId = url.searchParams.get("agentId") || "";
  const launchId = url.searchParams.get("launchId") || url.searchParams.get("id") || "";
  if (!agentId) {
    return Response.json(
      {
        error: "agentId_required",
        message: "GET /api/launch/pons?agentId=…&launchId=optional",
        note: "Partner GET /launch/pons is 405. Prefer launchId poll or agent tokenAddress.",
      },
      { status: 400 }
    );
  }

  const resolved = await resolveClawpumpAgentId(user.id, agentId);
  const target = resolved.clawpumpAgentId || (!resolved.localId ? agentId : null);
  if (!target) {
    return Response.json(
      {
        error: "no_clawpump_link",
        message:
          "Local agent has no clawpumpAgentId. Sync with cpk_ or pass the ClawPump agent id directly.",
        localId: resolved.localId,
      },
      { status: 400 }
    );
  }

  const tried: string[] = [];

  // 1) With launchId — docs: GET /api/agents/{id}/pons/launches/{id}
  if (launchId) {
    for (const [label, fn, path] of [
      [
        "platform",
        proxyClawpumpPlatformJson,
        `/agents/${target}/pons/launches/${launchId}`,
      ],
      ["v1", proxyClawpumpJson, `/agents/${target}/pons/launches/${launchId}`],
    ] as const) {
      tried.push(`GET ${label} ${path}`);
      const res = await fn(cpkResult.cpk, path, { method: "GET" });
      if (res.status !== 404 && res.status !== 405 && res.status !== 502) return res;
    }
  }

  // 2) List paths (may 404 on current Partner API)
  for (const [label, fn, path] of [
    ["platform", proxyClawpumpPlatformJson, `/agents/${target}/pons/launches`],
    ["v1", proxyClawpumpJson, `/agents/${target}/pons/launches`],
  ] as const) {
    tried.push(`GET ${label} ${path}`);
    const res = await fn(cpkResult.cpk, path, { method: "GET" });
    if (res.status !== 404 && res.status !== 405 && res.status !== 502) return res;
  }

  // 3) Agent record may carry tokenAddress
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
            note: "PONS list endpoint unavailable (404/405). Returning agent record; tokenAddress present when linked. Pass launchId to poll a specific launch.",
            tried,
          },
        },
        { status: 200 }
      );
    } catch {
      return agentRes;
    }
  }

  // Do NOT call GET /launch/pons — Partner API returns 405
  tried.push("skipped GET /launch/pons (known 405)");
  return launchPollUnavailable("pons", tried);
}

export async function POST(req: Request) {
  const user = await requireUser(req);
  if (!isUser(user)) return user;

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
  const payoutWallet = String(body.payoutWallet || body.payout || user.payoutWallet || "").trim();
  const logoUrl = String(body.logoUrl || body.logo || "").trim();

  const missing: string[] = [];
  if (!agentId) missing.push("agentId");
  if (!name) missing.push("name");
  if (!symbol) missing.push("symbol");
  if (!description) missing.push("description");
  if (!payoutWallet) missing.push("payoutWallet");
  if (!logoUrl) missing.push("logoUrl");
  if (missing.length) {
    return Response.json(
      {
        error: "missing_fields",
        missing,
        message:
          "Required: agentId, name, symbol, description, payoutWallet (0x EVM), logoUrl (https or ipfs)",
      },
      { status: 400 }
    );
  }

  const cpkResult = requireCpk(user);
  if (!cpkResult.ok) return cpkResult.response;

  const resolved = await resolveClawpumpAgentId(user.id, agentId);
  if (resolved.localId && !resolved.clawpumpAgentId) {
    return Response.json(
      {
        error: "no_clawpump_link",
        message:
          "Local WindAgents agent is not linked to ClawPump. Create/sync with cpk_, or pass ClawPump agentId.",
        localId: resolved.localId,
      },
      { status: 400 }
    );
  }
  const target = resolved.clawpumpAgentId || agentId;

  const payload = {
    agentId: target,
    name,
    symbol,
    description,
    payoutWallet,
    logoUrl,
  };

  const headers = new Headers();
  const idem = req.headers.get("Idempotency-Key") || req.headers.get("idempotency-key");
  if (idem) headers.set("Idempotency-Key", idem);
  const payTx = body.paymentTxHash ? String(body.paymentTxHash) : "";
  // Partner retries: same Idempotency-Key + paymentTxHash in body

  const res = await proxyClawpumpJson(cpkResult.cpk, "/launch/pons", {
    method: "POST",
    headers,
    body: JSON.stringify(payTx ? { ...payload, paymentTxHash: payTx } : payload),
  });

  try {
    const data = await res.clone().json();
    if (typeof data === "object" && data !== null) {
      const launchId =
        typeof (data as { id?: string }).id === "string"
          ? (data as { id: string }).id
          : typeof (data as { launchId?: string }).launchId === "string"
            ? (data as { launchId: string }).launchId
            : null;
      return Response.json(
        {
          ...data,
          windagents: {
            note: "ClawPump-backed PONS launch. If reserved, POLL with launchId — do not re-submit. Payment-required (pay / 401/402) is returned honestly.",
            poll: launchId
              ? `/api/launch/pons?agentId=${encodeURIComponent(target)}&launchId=${encodeURIComponent(launchId)}`
              : `/api/launch/pons?agentId=${encodeURIComponent(target)}`,
            pollAlt: `/api/agents/${encodeURIComponent(target)}/pons/launches${launchId ? `?launchId=${encodeURIComponent(launchId)}` : ""}`,
          },
        },
        { status: res.status }
      );
    }
  } catch {
    /* raw */
  }
  return res;
}
