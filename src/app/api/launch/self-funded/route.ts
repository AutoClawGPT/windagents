import { requireUser, isUser } from "@/lib/auth";
import { requireCpk, proxyClawpumpJson } from "@/lib/clawpump-launch";

/**
 * GET+POST /api/launch/self-funded — Partner GET/POST /launch/self-funded
 * External-wallet / x402 paid launch: preflight quote → pay → retry with proof.
 * Uses per-user cpk_. Honest 402s. Never fabricates mints.
 */
const TIMEOUT_MS = 120_000;

function forwardPaymentHeaders(req: Request): Headers {
  const headers = new Headers();
  const idem = req.headers.get("Idempotency-Key") || req.headers.get("idempotency-key");
  if (idem) headers.set("Idempotency-Key", idem);
  const paySig =
    req.headers.get("PAYMENT-SIGNATURE") ||
    req.headers.get("Payment-Signature") ||
    req.headers.get("payment-signature");
  if (paySig) headers.set("PAYMENT-SIGNATURE", paySig);
  return headers;
}

export async function GET(req: Request) {
  const user = await requireUser(req);
  if (!isUser(user)) return user;
  const gate = requireCpk(user);
  if (!gate.ok) return gate.response;

  const quoteMint = new URL(req.url).searchParams.get("quoteMint") || "";
  const path = quoteMint
    ? `/launch/self-funded?quoteMint=${encodeURIComponent(quoteMint)}`
    : "/launch/self-funded";

  return proxyClawpumpJson(gate.cpk, path, {
    method: "GET",
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
}

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

  // Forward Partner body as-is (preflight / txSignature / preflightToken / quoteMint fields).
  // Minimal local validation so empty posts fail fast with a helpful message.
  const name = String(body.name || "").trim();
  const symbol = String(body.symbol || "").trim();
  const description = String(body.description || "").trim();
  const agentId = String(body.agentId || body.agent_id || "").trim();
  const walletAddress = String(body.walletAddress || body.wallet_address || "").trim();
  const preflight = body.preflight === true || body.preflight === "true";
  const hasRetryProof = !!(body.txSignature || body.preflightToken);

  if (!preflight && !hasRetryProof) {
    if (!name || !symbol || !description || !agentId || !walletAddress) {
      return Response.json(
        {
          error: "missing_fields",
          missing: [
            !name && "name",
            !symbol && "symbol",
            !description && "description",
            !agentId && "agentId",
            !walletAddress && "walletAddress",
          ].filter(Boolean),
          message:
            "Self-funded launch: POST with preflight:true for a quote, or full body + txSignature + preflightToken after paying. Required: name, symbol, description, imageUrl, agentId, agentName, walletAddress.",
        },
        { status: 422 }
      );
    }
  }

  const headers = forwardPaymentHeaders(req);
  return proxyClawpumpJson(gate.cpk, "/launch/self-funded", {
    method: "POST",
    headers,
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
}
