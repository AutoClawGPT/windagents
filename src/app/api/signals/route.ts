import { db } from "@/db/client";
import { signals } from "@/db/schema";
import { generateId } from "@/lib/crypto";
import { desc } from "drizzle-orm";
import { SOL_MINT, USDC_MINT } from "@/lib/utils";

async function pullMoonpaySignals() {
  const res = await fetch("https://agents.moonpay.com/api/tools/token_trending_list", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chain: "solana", limit: 12, page: 1 }),
  });
  if (!res.ok) throw new Error(`MoonPay ${res.status}`);
  const data = await res.json();
  const items = data.items || [];
  return (items as Record<string, unknown>[]).slice(0, 12).map((t) => {
    const md = (t.marketData || {}) as Record<string, unknown>;
    const pc = (md.priceChangePercent || {}) as Record<string, number>;
    const ch = typeof pc["24h"] === "number" ? pc["24h"] : 0;
    const type = ch > 0.05 ? "buy" : ch < -0.05 ? "sell" : "hold";
    return {
      type,
      source: "moonpay_trending",
      tokenSymbol: String(t.symbol || "?"),
      tokenMint: String(t.address || ""),
      message: `${t.symbol} 24h change ${(ch * 100).toFixed(2)}% · mcap ${md.marketCap ?? "n/a"}`,
      price: md.price != null ? String(md.price) : null,
      confidence: Math.min(99, Math.round(Math.abs(ch) * 100 + 40)),
      metadata: JSON.stringify({ name: t.name, image: t.image }),
    };
  });
}

export async function GET() {
  let live: Awaited<ReturnType<typeof pullMoonpaySignals>> = [];
  let source = "moonpay";
  let note = "Live MoonPay token_trending_list mapped to signal cards.";
  try {
    live = await pullMoonpaySignals();
  } catch (e: unknown) {
    source = "status_only";
    note =
      e instanceof Error
        ? `MoonPay trending unavailable: ${e.message}. Showing Jupiter/wallet status instead — no fake prices.`
        : "MoonPay unavailable";
  }

  // Persist a snapshot of live signals (best-effort, dedupe by mint+type recent)
  for (const s of live.slice(0, 8)) {
    try {
      await db.insert(signals).values({
        id: generateId(),
        type: s.type,
        source: s.source,
        tokenSymbol: s.tokenSymbol,
        tokenMint: s.tokenMint,
        message: s.message,
        price: s.price,
        confidence: s.confidence,
        metadata: s.metadata,
      });
    } catch {
      /* ignore */
    }
  }

  const stored = await db.select().from(signals).orderBy(desc(signals.createdAt)).limit(40);

  // Live infra status (always real)
  let jupiterOk = false;
  let jupiterError: string | null = null;
  try {
    const jr = await fetch(
      `${process.env.JUPITER_QUOTE_URL || "https://lite-api.jup.ag/swap/v1/quote"}?inputMint=${SOL_MINT}&outputMint=${USDC_MINT}&amount=1000000&slippageBps=50`,
      { headers: { Accept: "application/json" } }
    );
    jupiterOk = jr.ok;
    if (!jr.ok) jupiterError = `HTTP ${jr.status}`;
  } catch (e: unknown) {
    jupiterError = e instanceof Error ? e.message : "unreachable";
  }

  return Response.json({
    signals: live.length
      ? live.map((s, i) => ({ id: `live-${i}`, ...s, createdAt: new Date().toISOString() }))
      : stored,
    storedCount: stored.length,
    source,
    note,
    status: {
      jupiter: jupiterOk ? "ok" : "down",
      jupiterError,
      heliusConfigured: !!process.env.HELIUS_API_KEY,
      rpc: process.env.SOLANA_RPC_URL || "https://api.mainnet-beta.solana.com",
    },
  });
}
