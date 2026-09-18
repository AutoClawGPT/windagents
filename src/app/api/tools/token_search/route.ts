import { moonpayToolProxy } from "@/lib/moonpay-tools";

export async function POST(req: Request) {
  let body: Record<string, unknown> = {};
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "invalid_json", message: "JSON body required" }, { status: 400 });
  }
  const query = String(body.query || "").trim();
  if (!query) {
    return Response.json({ error: "query_required", message: "query is required" }, { status: 400 });
  }
  const chain = typeof body.chain === "string" ? body.chain.trim() : "";
  if (!chain) {
    return Response.json(
      {
        error: "chain_required",
        message: 'chain is required (e.g. "solana") — omitting it yields opaque upstream 400/502',
      },
      { status: 400 }
    );
  }
  const payload: Record<string, unknown> = {
    query,
    chain,
    limit: typeof body.limit === "number" ? body.limit : Number(body.limit) || 10,
  };
  if (body.page != null) payload.page = Number(body.page) || 1;
  return moonpayToolProxy("token_search", payload);
}
