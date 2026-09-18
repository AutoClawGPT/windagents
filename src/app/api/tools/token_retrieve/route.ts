import { moonpayToolProxy } from "@/lib/moonpay-tools";

/**
 * Ensure Solana mint / address fields keep the full client-requested base58.
 * Upstream has been observed returning a same-length corrupted SOL mint
 * (…1111 vs …11112) — always prefer the request mint for identity fields.
 */
function restoreFullMint(data: unknown, full: string): unknown {
  if (!full || full.length < 32) return data;
  if (Array.isArray(data)) {
    return data.map((item) => restoreFullMint(item, full));
  }
  if (typeof data !== "object" || data === null) return data;
  const out: Record<string, unknown> = { ...(data as Record<string, unknown>) };

  for (const key of ["address", "token", "mint", "mintAddress", "tokenAddress"]) {
    const v = out[key];
    if (typeof v !== "string" || !v) continue;
    // Prefix truncation (shorter)
    if (v.length < full.length && full.startsWith(v)) {
      out[key] = full;
      continue;
    }
    // Same-length near-miss / corrupted last char (SOL …1111 vs …11112)
    if (
      v.length === full.length &&
      v !== full &&
      (v.slice(0, -1) === full.slice(0, -1) || full.startsWith(v.slice(0, -1)))
    ) {
      out[key] = full;
    }
  }

  for (const nest of ["token", "data", "result", "item"]) {
    if (nest in out && typeof out[nest] === "object" && out[nest] !== null && nest !== "token") {
      out[nest] = restoreFullMint(out[nest], full);
    } else if (nest === "token" && typeof out.token === "object" && out.token !== null) {
      out.token = restoreFullMint(out.token, full);
    }
  }

  // Always echo the requested mint as address for clients
  out.address = full;
  return out;
}

export async function POST(req: Request) {
  let body: Record<string, unknown> = {};
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "invalid_json", message: "JSON body required" }, { status: 400 });
  }
  // WindAgents accepts address; MoonPay Agents tool expects `token` — never slice mint.
  const token = String(body.token || body.address || "").trim();
  if (!token) {
    return Response.json(
      { error: "address_required", message: "address (or token) is required" },
      { status: 400 }
    );
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

  const payload: Record<string, unknown> = { token, chain };
  const upstream = await moonpayToolProxy("token_retrieve", payload);

  try {
    const clone = upstream.clone();
    const data = await clone.json();
    if (upstream.ok) {
      const fixed = restoreFullMint(data, token);
      return Response.json(fixed, {
        status: 200,
        headers: { "Cache-Control": "public, max-age=30" },
      });
    }
  } catch {
    /* fall through */
  }
  return upstream;
}
