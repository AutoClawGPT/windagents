/**
 * ClawPump Partner public skill catalogue + docs extras + three.ws install pointers.
 * Live source: GET https://clawpump.tech/api/v1/skills (Bearer cpk_ from Settings — never platform keys).
 * Seed matches Partner API public slugs (probed 2026-09-15). Docs marketing slugs differ.
 */
import { clawpumpFetch } from "./clawpump";

export type ClawpumpSkill = {
  slug: string;
  name: string;
  description: string;
  alwaysOn?: boolean;
  tags?: string[];
  source?: string;
  /** When set, card is an install/docs pointer — not Partner POST enable. */
  installUrl?: string;
  category?: string;
  enableable?: boolean;
};

/** Seed / offline mirror of Partner GET /skills (9 public slugs). */
export const CLAWPUMP_PUBLIC_SKILLS: ClawpumpSkill[] = [
  {
    slug: "trading",
    name: "Trading",
    description: "Swap tokens, arbitrage, and liquidity operations on Solana DEXs",
    alwaysOn: false,
    tags: ["defi", "swap", "clawpump"],
    category: "DeFi",
    enableable: true,
  },
  {
    slug: "perps",
    name: "Perps Trading",
    description: "Preview and execute Phoenix perpetual futures orders on Solana",
    alwaysOn: false,
    tags: ["perps", "phoenix", "clawpump"],
    category: "DeFi",
    enableable: true,
  },
  {
    slug: "token-launch",
    name: "Token Launch",
    description: "Launch tokens via pump.fun and ClawPump",
    alwaysOn: false,
    tags: ["launch", "pump.fun", "clawpump"],
    category: "DeFi",
    enableable: true,
  },
  {
    slug: "portfolio",
    name: "Portfolio Management",
    description: "Balance tracking, P&L analysis, and rebalancing",
    alwaysOn: false,
    tags: ["portfolio", "clawpump"],
    category: "DeFi",
    enableable: true,
  },
  {
    slug: "market-intelligence",
    name: "Market Intelligence",
    description: "Price feeds, trend analysis, and market signals",
    alwaysOn: false,
    tags: ["intel", "signals", "clawpump"],
    category: "Intelligence",
    enableable: true,
  },
  {
    slug: "social",
    name: "Social Media",
    description: "Post to Twitter/X, monitor mentions and engagement",
    alwaysOn: false,
    tags: ["social", "twitter", "clawpump"],
    category: "Social",
    enableable: true,
  },
  {
    slug: "sniper",
    name: "Token Sniper",
    description: "New token launch detection and security evaluation",
    alwaysOn: false,
    tags: ["sniper", "clawpump"],
    category: "Intelligence",
    enableable: true,
  },
  {
    slug: "wallet",
    name: "Wallet Operations",
    description: "Transfer tokens, check balances, manage wallets",
    alwaysOn: false,
    tags: ["wallet", "clawpump"],
    category: "Infrastructure",
    enableable: true,
  },
  {
    slug: "image-generation",
    name: "Image Generation",
    description: "Generate images from text prompts for avatars, content, and social posts",
    alwaysOn: false,
    tags: ["image", "clawpump"],
    category: "Infrastructure",
    enableable: true,
  },
];

/**
 * ClawPump docs built-in catalogue extras (clawpump.tech/docs — ~15 built-in).
 * Partner GET /skills returns only the 9 public slugs above. These are documentation
 * pointers so registrants see the full marketing surface; enable in ClawPump dashboard
 * if/when upstream exposes them on the agent.
 */
export const CLAWPUMP_DOCS_EXTRA_SKILLS: ClawpumpSkill[] = [
  {
    slug: "defi-trading",
    name: "DeFi Trading (docs)",
    description:
      "Docs slug for swaps/arbitrage/liquidity (Partner enable slug is usually `trading`).",
    tags: ["defi", "docs", "clawpump"],
    category: "DeFi",
    source: "clawpump-docs",
    enableable: false,
    installUrl: "https://clawpump.tech/docs",
  },
  {
    slug: "perps-trading",
    name: "Perps Trading (docs)",
    description: "Docs slug for Phoenix perps (Partner enable slug: `perps`).",
    tags: ["perps", "docs", "clawpump"],
    category: "DeFi",
    source: "clawpump-docs",
    enableable: false,
    installUrl: "https://clawpump.tech/docs",
  },
  {
    slug: "market-intel",
    name: "Market Intelligence (docs)",
    description: "Docs slug (Partner: `market-intelligence`). Trader Ralph / signals.",
    tags: ["intel", "docs", "clawpump"],
    category: "Intelligence",
    source: "clawpump-docs",
    enableable: false,
    installUrl: "https://clawpump.tech/docs",
  },
  {
    slug: "token-sniper",
    name: "Token Sniper (docs)",
    description: "Docs slug (Partner: `sniper`).",
    tags: ["sniper", "docs", "clawpump"],
    category: "Intelligence",
    source: "clawpump-docs",
    enableable: false,
    installUrl: "https://clawpump.tech/docs",
  },
  {
    slug: "bitget-intel",
    name: "Bitget Intel",
    description: "Ambient honeypot/tax/authority checks — always-on on ClawPump agents.",
    alwaysOn: true,
    tags: ["security", "ambient", "clawpump"],
    category: "Intelligence",
    source: "clawpump-docs",
    enableable: false,
    installUrl: "https://clawpump.tech/docs",
  },
  {
    slug: "news",
    name: "News",
    description: "Stocks/crypto/tech news with sentiment — ClawPump docs skill.",
    tags: ["news", "docs", "clawpump"],
    category: "Intelligence",
    source: "clawpump-docs",
    enableable: false,
    installUrl: "https://clawpump.tech/docs",
  },
  {
    slug: "twitter",
    name: "Twitter/X (docs)",
    description: "Docs social skill (Partner: `social`). Needs Twitter OAuth on ClawPump.",
    tags: ["social", "docs", "clawpump"],
    category: "Social",
    source: "clawpump-docs",
    enableable: false,
    installUrl: "https://clawpump.tech/docs",
  },
  {
    slug: "marketplace",
    name: "Marketplace",
    description: "List/bid/transfer agents on ClawPump marketplace — docs skill.",
    tags: ["marketplace", "docs", "clawpump"],
    category: "Social",
    source: "clawpump-docs",
    enableable: false,
    installUrl: "https://clawpump.tech/docs",
  },
  {
    slug: "wallet-ops",
    name: "Wallet Ops (docs)",
    description: "Docs slug (Partner: `wallet`).",
    tags: ["wallet", "docs", "clawpump"],
    category: "Infrastructure",
    source: "clawpump-docs",
    enableable: false,
    installUrl: "https://clawpump.tech/docs",
  },
  {
    slug: "x402",
    name: "Pay.sh / x402 Services",
    description: "Recommend Pay.sh services and call paid APIs via x402 USDC — ClawPump docs.",
    tags: ["x402", "payments", "clawpump"],
    category: "Infrastructure",
    source: "clawpump-docs",
    enableable: false,
    installUrl: "https://clawpump.tech/docs",
  },
  {
    slug: "agent-weed",
    name: "AgentWeed 420",
    description: "Lifestyle skill (NYC delivery via Rent-a-Human) — ClawPump docs only.",
    tags: ["lifestyle", "docs", "clawpump"],
    category: "Lifestyle",
    source: "clawpump-docs",
    enableable: false,
    installUrl: "https://clawpump.tech/docs",
  },
  {
    slug: "pumprpg",
    name: "PUMP.RPG Arena",
    description: "Arena odds + capped SOL bets — ClawPump docs skill.",
    tags: ["lifestyle", "docs", "clawpump"],
    category: "Lifestyle",
    source: "clawpump-docs",
    enableable: false,
    installUrl: "https://clawpump.tech/docs",
  },
];

/**
 * three.ws pump-fun-skills — Agent Skills format install pointers (raw SKILL.md).
 * Do NOT delete ClawPump catalogue; these are additive documentation cards.
 */
export const THREE_WS_PUMP_FUN_SKILLS: ClawpumpSkill[] = [
  {
    slug: "threews-create-coin",
    name: "Create Coin (three.ws)",
    description:
      "pump.fun create-coin skill — initial buy, mayhem, cashback, tokenized agents, Jito. Install into your agent runtime.",
    tags: ["pump.fun", "launch", "three.ws", "install"],
    category: "pump-fun-skills",
    source: "three.ws",
    enableable: false,
    installUrl:
      "https://raw.githubusercontent.com/nirholas/three.ws/main/pump-fun-skills/create-coin/SKILL.md",
  },
  {
    slug: "threews-swap",
    name: "Swap (three.ws)",
    description:
      "Buy/sell on bonding curve or AMM with slippage + Jito protection. Agent Skills pack.",
    tags: ["pump.fun", "swap", "three.ws", "install"],
    category: "pump-fun-skills",
    source: "three.ws",
    enableable: false,
    installUrl:
      "https://raw.githubusercontent.com/nirholas/three.ws/main/pump-fun-skills/swap/SKILL.md",
  },
  {
    slug: "threews-coin-fees",
    name: "Coin Fees (three.ws)",
    description:
      "Inspect/collect/distribute creator fees; sharing configs up to 10 shareholders.",
    tags: ["pump.fun", "fees", "three.ws", "install"],
    category: "pump-fun-skills",
    source: "three.ws",
    enableable: false,
    installUrl:
      "https://raw.githubusercontent.com/nirholas/three.ws/main/pump-fun-skills/coin-fees/SKILL.md",
  },
  {
    slug: "threews-tokenized-agents",
    name: "Tokenized Agent Payments (three.ws)",
    description:
      "Accept USDC/wSOL + verify invoices via @three-ws/agent-payments. Not wired into WindAgents runtime.",
    tags: ["payments", "tokenized", "three.ws", "install"],
    category: "pump-fun-skills",
    source: "three.ws",
    enableable: false,
    installUrl:
      "https://raw.githubusercontent.com/nirholas/three.ws/main/pump-fun-skills/tokenized-agents/SKILL.md",
  },
  {
    slug: "threews-reactive",
    name: "Reactive Avatar (three.ws)",
    description:
      "PumpPortal WebSocket → agent-3d gestures/emotes (no LLM). Phase-2 for WindAgents UI.",
    tags: ["avatar", "reactive", "three.ws", "install"],
    category: "pump-fun-skills",
    source: "three.ws",
    enableable: false,
    installUrl:
      "https://raw.githubusercontent.com/nirholas/three.ws/main/pump-fun-skills/reactive/SKILL.md",
  },
];

/** WindAgents-native platform helpers (not ClawPump Partner slugs). */
export const WINDAGENTS_PLATFORM_SKILLS: ClawpumpSkill[] = [
  {
    slug: "windagents-register",
    name: "WindAgents Register",
    description: "Register humans and Ed25519 agents on WindAgents",
    tags: ["auth", "agents", "windagents"],
    source: "windagents",
    category: "Platform",
    enableable: false,
  },
  {
    slug: "jupiter-swap",
    name: "Jupiter Swap",
    description: "Real Jupiter quote + gated execute via WindAgents",
    tags: ["defi", "swap", "solana", "windagents"],
    source: "windagents",
    category: "Platform",
    enableable: false,
  },
  {
    slug: "paybox-wallet",
    name: "PayBox Wallet",
    description: "Non-custodial PayBox MCP wallets (pbx_ in Settings)",
    tags: ["wallet", "paybox", "mcp", "windagents"],
    source: "windagents",
    category: "Platform",
    enableable: false,
  },
];

function normalizeSkill(raw: unknown): ClawpumpSkill | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const slug = String(o.slug || o.id || "").trim();
  const name = String(o.name || slug).trim();
  if (!slug || !name) return null;
  return {
    slug,
    name,
    description: String(o.description || ""),
    alwaysOn: !!o.alwaysOn,
    tags: Array.isArray(o.tags) ? o.tags.map(String) : ["clawpump"],
    source: "clawpump",
    enableable: true,
    category: typeof o.category === "string" ? o.category : undefined,
  };
}

export async function fetchClawpumpSkillsCatalog(cpk: string): Promise<{
  ok: boolean;
  skills: ClawpumpSkill[];
  error?: string;
  upstreamStatus?: number;
}> {
  try {
    const res = await clawpumpFetch("/skills", cpk, { method: "GET" });
    const text = await res.text();
    let data: unknown;
    try {
      data = JSON.parse(text);
    } catch {
      return {
        ok: false,
        skills: [],
        error: `ClawPump /skills non-JSON (${res.status})`,
        upstreamStatus: res.status,
      };
    }
    if (!res.ok) {
      const err =
        typeof data === "object" && data && "error" in data
          ? String((data as { error: unknown }).error)
          : `HTTP ${res.status}`;
      return { ok: false, skills: [], error: err, upstreamStatus: res.status };
    }
    const list =
      typeof data === "object" && data && Array.isArray((data as { skills?: unknown }).skills)
        ? ((data as { skills: unknown[] }).skills)
        : Array.isArray(data)
          ? data
          : [];
    const skills = list.map(normalizeSkill).filter((s): s is ClawpumpSkill => !!s);
    return { ok: true, skills: skills.length ? skills : CLAWPUMP_PUBLIC_SKILLS };
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "unreachable";
    return { ok: false, skills: [], error: msg, upstreamStatus: 0 };
  }
}

/** Enable / replace skill slugs on a ClawPump agent (Partner POST /agents/:id). */
export async function enableClawpumpAgentSkills(
  cpk: string,
  clawpumpAgentId: string,
  skills: string[]
): Promise<{ ok: boolean; status: number; data: unknown }> {
  const res = await clawpumpFetch(`/agents/${encodeURIComponent(clawpumpAgentId)}`, cpk, {
    method: "POST",
    body: JSON.stringify({ skills }),
  });
  const text = await res.text();
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    data = { raw: text };
  }
  return { ok: res.ok, status: res.status, data };
}
