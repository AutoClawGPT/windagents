import { requireUser, isUser } from "@/lib/auth";
import { requireCpk, proxyClawpumpJson } from "@/lib/clawpump-launch";

/**
 * POST /api/launch — ClawPump Partner API paid/selfFunded pump.fun launch
 * Body forwarded to POST https://clawpump.tech/api/v1/launch (user's cpk_).
 * GET — short help (use pump-pairs / pons / claw / self-funded / pools for other venues).
 */
export async function GET() {
  return Response.json({
    venues: {
      pumpfun: "POST /api/launch → ClawPump /launch",
      pumpPairs: "GET /api/launch/pump-pairs",
      selfFunded: "GET+POST /api/launch/self-funded (preflight → pay → retry)",
      pons: "POST /api/launch/pons",
      pools: "POST /api/launch/pools (Idempotency-Key recommended)",
      claw: "POST /api/launch/claw → Partner /launch (payment may be required)",
      feesEarnings: "GET /api/fees/earnings?agentId=",
    },
    note: "Requires cpk_ in Settings. Payment-required responses pass through honestly. Gasless first-3 is retired.",
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

  const agentId = String(body.agentId || body.agent_id || "").trim();
  const symbol = String(body.symbol || "").trim();
  const description = String(body.description || "").trim();
  if (!agentId || !symbol || !description) {
    return Response.json(
      {
        error: "missing_fields",
        missing: [
          !agentId && "agentId",
          !symbol && "symbol",
          !description && "description",
        ].filter(Boolean),
        message:
          "Required: agentId (ClawPump), symbol, description. Optional: name, imageUrl, selfFunded, pumpQuoteMint, pumpCreatorFeeBps, initialBuySol, payoutWallet, metaplexGenesis, metaplexFirstBuyAmountSol",
      },
      { status: 422 }
    );
  }

  const payload: Record<string, unknown> = {
    agentId,
    symbol,
    description,
    name: body.name ? String(body.name) : symbol,
    imageUrl: body.imageUrl || body.logoUrl || body.image_url || undefined,
    payoutWallet: body.payoutWallet || undefined,
    selfFunded: body.selfFunded === true || body.selfFunded === "true",
    pumpQuoteMint: body.pumpQuoteMint || undefined,
    pumpCreatorFeeBps: body.pumpCreatorFeeBps ?? undefined,
    initialBuySol: body.initialBuySol ?? body.devBuySol ?? undefined,
    twitter: body.twitter || body.twitterUrl || undefined,
  };
  if (body.metaplexGenesis === true || body.metaplexGenesis === "true") {
    payload.metaplexGenesis = true;
  }
  if (body.metaplexFirstBuyAmountSol != null) {
    payload.metaplexFirstBuyAmountSol = body.metaplexFirstBuyAmountSol;
  }

  return proxyClawpumpJson(gate.cpk, "/launch", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}
