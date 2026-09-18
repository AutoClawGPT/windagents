import { SOL_MINT, USDC_MINT, projectMints } from "@/lib/utils";

type TokenCard = {
  address: string;
  name: string;
  symbol: string;
  image?: string | null;
  chain: string;
  price?: number | null;
  marketCap?: number | null;
  volume24h?: number | null;
  priceChange24h?: number | null;
  source: string;
};

async function moonpayTrending(limit = 20): Promise<TokenCard[]> {
  const res = await fetch("https://agents.moonpay.com/api/tools/token_trending_list", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chain: "solana", limit, page: 1 }),
    next: { revalidate: 60 },
  });
  if (!res.ok) throw new Error(`MoonPay trending ${res.status}`);
  const data = await res.json();
  const items = data.items || data.tokens || data.data || [];
  return (items as Record<string, unknown>[]).map((t) => {
    const md = (t.marketData || {}) as Record<string, unknown>;
    const pc = (md.priceChangePercent || {}) as Record<string, number>;
    const vol = (md.volume || {}) as Record<string, number>;
    return {
      address: String(t.address || t.mint || ""),
      name: String(t.name || "Unknown"),
      symbol: String(t.symbol || "?"),
      image: (t.image as string) || null,
      chain: String(t.chain || "solana"),
      price: typeof md.price === "number" ? md.price : null,
      marketCap: typeof md.marketCap === "number" ? md.marketCap : null,
      volume24h: typeof vol["24h"] === "number" ? vol["24h"] : null,
      priceChange24h: typeof pc["24h"] === "number" ? pc["24h"] : null,
      source: "moonpay",
    };
  }).filter((t) => t.address);
}

function knownMintsFallback(): TokenCard[] {
  const m = projectMints();
  const cards: TokenCard[] = [
    {
      address: SOL_MINT,
      name: "Solana",
      symbol: "SOL",
      chain: "solana",
      price: null,
      marketCap: null,
      volume24h: null,
      priceChange24h: null,
      source: "known_mint",
    },
    {
      address: USDC_MINT,
      name: "USD Coin",
      symbol: "USDC",
      chain: "solana",
      price: null,
      marketCap: null,
      volume24h: null,
      priceChange24h: null,
      source: "known_mint",
    },
  ];
  if (m.WIND) {
    cards.push({
      address: m.WIND,
      name: "WIND",
      symbol: "WIND",
      chain: "solana",
      price: null,
      source: "env_WIND_MINT",
    });
  }
  if (m.AGENT) {
    cards.push({
      address: m.AGENT,
      name: "AGENT",
      symbol: "AGENT",
      chain: "solana",
      price: null,
      source: "env_AGENT_MINT",
    });
  }
  return cards;
}

export async function GET() {
  try {
    const tokens = await moonpayTrending(24);
    return Response.json({
      tokens,
      source: "moonpay_token_trending_list",
      note: "Live MoonPay Agents trending — prices are real, never fabricated.",
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "trending unavailable";
    return Response.json({
      tokens: knownMintsFallback(),
      source: "fallback_known_mints",
      emptyPrices: true,
      note: `MoonPay trending unavailable (${msg}). Showing known mints without fake prices. Set WIND_MINT / AGENT_MINT in env for project tokens. Use /api/swap/quote for live Jupiter pricing.`,
    });
  }
}
