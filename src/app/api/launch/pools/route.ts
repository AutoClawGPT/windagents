import { requireUser, isUser } from "@/lib/auth";
import { requireCpk, proxyClawpumpJson } from "@/lib/clawpump-launch";

/**
 * POST /api/launch/pools — Partner POST /launch/pools (Uniswap via pools.trade).
 * Passes Idempotency-Key when the client sends it (retries without it can double-mint).
 */
export async function POST(req: Request) {
  const user = await requireUser(req);
  if (!isUser(user)) return user;
  const gate = requireCpk(user);
  if (!gate.ok) return gate.response;

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "invalid_json" }, { status: 400 });
  }

  const agentId = String(body.agentId || body.agent_id || "").trim();
  const symbol = String(body.symbol || "").trim();
  if (!agentId || !symbol) {
    return Response.json(
      {
        error: "missing_fields",
        missing: [!agentId && "agentId", !symbol && "symbol"].filter(Boolean),
        message:
          "Required: agentId, symbol. Optional Partner fields forwarded. Send Idempotency-Key on retries.",
      },
      { status: 422 }
    );
  }

  const headers = new Headers();
  const idem = req.headers.get("Idempotency-Key") || req.headers.get("idempotency-key");
  if (idem) headers.set("Idempotency-Key", idem);
  const paySig =
    req.headers.get("PAYMENT-SIGNATURE") ||
    req.headers.get("Payment-Signature") ||
    req.headers.get("payment-signature");
  if (paySig) headers.set("PAYMENT-SIGNATURE", paySig);

  return proxyClawpumpJson(gate.cpk, "/launch/pools", {
    method: "POST",
    headers,
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(120_000),
  });
}
