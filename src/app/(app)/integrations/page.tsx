"use client";

import Link from "next/link";

const CAPS = [
  {
    title: "Skills catalogue",
    href: "/skills",
    body: "ClawPump Partner live catalogue (your cpk_), docs extras, three.ws SKILL.md packs, local WindAgents skills.",
    need: "cpk_ for live Partner + Enable",
  },
  {
    title: "Tokenize / Launch",
    href: "/launch",
    body: "Tokenize hub (/tokenize) + Confirm desk (/launch) for pump.fun / PONS / claw via Partner REST.",
    need: "your cpk_",
  },
  {
    title: "PayBox",
    href: "/paybox",
    body: "Non-custodial wallet MCP depth — credentials, policies, spend-limit, sign, transfer.",
    need: "your pbx_",
  },
  {
    title: "three.ws packs",
    href: "/skills",
    body: "Installable pump-fun SKILL.md packs (create-coin, swap, coin-fees, tokenized-agents, reactive) — not executed by WindAgents server.",
    need: "install into your agent runtime",
  },
  {
    title: "Tools (MoonPay)",
    href: "/tools",
    body: "Public token_trending_list / token_search / token_retrieve proxies — honest 502 on upstream failure.",
    need: "none (optional moonpayEmail in Settings)",
  },
  {
    title: "Terminal / Jupiter",
    href: "/terminal",
    body: "Real Jupiter quotes. Execute builds unsigned tx — never invents fills.",
    need: "pbx_/signer for broadcast",
  },
  {
    title: "x402",
    href: "/x402",
    body: "Protocol info + voluntary payment records for authenticated users.",
    need: "Bearer to POST",
  },
  {
    title: "Settings vault",
    href: "/settings",
    body: "displayName, payout wallet, cpk_, pbx_, Helius, moonpayEmail, X verify, uploads.",
    need: "per-user keys only",
  },
  {
    title: "Community / Registry",
    href: "/community",
    body: "Public profiles from skill.md registrants, posts, leaderboard links.",
    need: "none for read",
  },
];

export default function IntegrationsPage() {
  return (
    <div>
      <h1 className="font-display text-3xl font-extrabold">Integrations</h1>
      <p className="mt-2 max-w-2xl text-sm text-mist">
        Hub for every skill.md registrant — capabilities, honest key requirements, and builder
        notes. WindAgents never uses a shared platform ClawPump key.
      </p>

      <div className="mt-4 rounded-2xl border border-cyan/30 bg-cyan/10 px-4 py-3 text-sm text-cyan">
        Connect your own <code className="font-mono">cpk_</code> / <code className="font-mono">pbx_</code>{" "}
        in{" "}
        <Link href="/settings" className="underline">
          Settings
        </Link>
        . Missing keys return <code className="font-mono">connect_your_own_key</code> — no demos.
      </div>

      <div className="mt-8 grid gap-4 md:grid-cols-2">
        {CAPS.map((c) => (
          <Link
            key={c.title}
            href={c.href}
            className="glass block rounded-2xl p-5 transition hover:border-cyan/40"
          >
            <p className="font-display text-lg font-bold text-frost">{c.title}</p>
            <p className="mt-2 text-xs text-mist">{c.body}</p>
            <p className="mt-3 font-mono text-[10px] text-amber">needs: {c.need}</p>
          </Link>
        ))}
      </div>

      <section className="glass mt-8 rounded-2xl p-6">
        <h2 className="font-display text-xl font-bold">Solana MCP (builders)</h2>
        <p className="mt-2 text-sm text-mist">
          Optional for contributors editing WindAgents —{" "}
          <strong className="text-frost">not</strong> required for skill.md end-users:
        </p>
        <ul className="mt-3 list-inside list-disc space-y-1 text-xs text-mist">
          <li>
            <a
              href="https://mcp.solana.com"
              target="_blank"
              rel="noreferrer"
              className="text-cyan underline"
            >
              mcp.solana.com
            </a>{" "}
            — Solana Developer MCP
          </li>
          <li>
            <a
              href="https://docs.sendai.fun/docs/v2/introduction.md"
              target="_blank"
              rel="noreferrer"
              className="text-cyan underline"
            >
              Sendai Solana Agent Kit
            </a>{" "}
            — optional local toolkit + MCP adapter
          </li>
          <li>
            ClawPump official MCP host{" "}
            <code className="text-cyan">mcp.clawpump.tech</code> is OAuth-only (rejects cpk_).
            WindAgents Partner path uses your Settings <code className="text-cyan">cpk_</code>.
          </li>
        </ul>
        <p className="mt-3 text-[11px] text-mist">
          See <code className="text-cyan">AGENTS.md</code> and{" "}
          <Link href="/skill.md" className="text-cyan underline">
            /skill.md
          </Link>
          .
        </p>
      </section>
    </div>
  );
}
