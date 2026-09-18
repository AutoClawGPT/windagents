"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { apiFetch, getToken } from "@/lib/client-auth";

export default function HomeOverview() {
  const [settings, setSettings] = useState<Record<string, unknown> | null>(null);
  const [agents, setAgents] = useState<unknown[]>([]);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (!getToken()) {
      setErr("No session — register or login first.");
      return;
    }
    (async () => {
      const s = await apiFetch("/api/settings");
      if (s.res.ok) setSettings(s.data);
      else setErr(s.data.error || "Auth required");
      const a = await apiFetch("/api/agents");
      if (a.res.ok) setAgents(a.data.agents || []);
    })();
  }, []);

  const keys = (settings?.keys || {}) as {
    hasClawpump?: boolean;
    hasPaybox?: boolean;
    hasHelius?: boolean;
  };

  return (
    <div>
      <h1 className="font-display text-3xl font-extrabold tracking-tight md:text-4xl">
        Forge overview
      </h1>
      <p className="mt-2 max-w-xl text-sm text-mist">
        Spatial control for Solana agents — orbital dock below, live keys, no fabricated balances.
        Every registrant uses their own vault keys.
      </p>

      {err && (
        <div className="mt-6 rounded-2xl border border-ember/40 bg-ember/10 p-4 text-sm text-ember">
          {err}{" "}
          <Link href="/register" className="underline">
            Register
          </Link>
        </div>
      )}

      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="glass rounded-2xl p-5">
          <p className="font-mono text-[10px] uppercase tracking-widest text-mist">ClawPump</p>
          <p className="mt-2 font-display text-2xl font-bold">
            {keys.hasClawpump ? (
              <span className="text-cyan">connected</span>
            ) : (
              <span className="text-amber">needs cpk_</span>
            )}
          </p>
          <Link href="/settings" className="mt-3 inline-block text-xs text-cyan hover:underline">
            Settings →
          </Link>
        </div>
        <div className="glass rounded-2xl p-5">
          <p className="font-mono text-[10px] uppercase tracking-widest text-mist">PayBox</p>
          <p className="mt-2 font-display text-2xl font-bold">
            {keys.hasPaybox ? (
              <span className="text-cyan">connected</span>
            ) : (
              <span className="text-amber">needs pbx_</span>
            )}
          </p>
          <Link href="/paybox" className="mt-3 inline-block text-xs text-cyan hover:underline">
            PayBox →
          </Link>
        </div>
        <div className="glass rounded-2xl p-5">
          <p className="font-mono text-[10px] uppercase tracking-widest text-mist">Helius</p>
          <p className="mt-2 font-display text-2xl font-bold">
            {keys.hasHelius ? (
              <span className="text-cyan">connected</span>
            ) : (
              <span className="text-mist">optional</span>
            )}
          </p>
          <Link href="/settings" className="mt-3 inline-block text-xs text-cyan hover:underline">
            Add key →
          </Link>
        </div>
        <div className="glass rounded-2xl p-5">
          <p className="font-mono text-[10px] uppercase tracking-widest text-mist">Agents</p>
          <p className="mt-2 font-display text-2xl font-bold text-frost">{agents.length}</p>
          <Link href="/agents" className="mt-3 inline-block text-xs text-cyan hover:underline">
            Manage →
          </Link>
        </div>
      </div>

      <div className="mt-6 flex flex-wrap gap-3">
        <Link href="/launch" className="btn-cyan rounded-xl px-5 py-2.5 text-sm">
          Tokenize
        </Link>
        <Link href="/skills" className="btn-ghost rounded-xl px-5 py-2.5 text-sm">
          Skills
        </Link>
        <Link href="/settings" className="btn-ghost rounded-xl px-5 py-2.5 text-sm">
          Settings
        </Link>
        <Link href="/integrations" className="btn-ghost rounded-xl px-5 py-2.5 text-sm">
          Integrations
        </Link>
      </div>

      <div className="mt-8 flex flex-wrap gap-3">
        <Link href="/terminal" className="btn-ghost rounded-xl px-5 py-2.5 text-sm">
          Open swap desk
        </Link>
        <Link href="/marketplace" className="btn-ghost rounded-xl px-5 py-2.5 text-sm">
          Marketplace
        </Link>
        <Link href="/signals" className="btn-ghost rounded-xl px-5 py-2.5 text-sm">
          Signals
        </Link>
        <Link href="/community" className="btn-ghost rounded-xl px-5 py-2.5 text-sm">
          Community
        </Link>
        <Link href="/bounties" className="btn-ghost rounded-xl px-5 py-2.5 text-sm">
          Bounties
        </Link>
        <Link href="/portfolio" className="btn-ghost rounded-xl px-5 py-2.5 text-sm">
          Portfolio
        </Link>
        <Link href="/wallet" className="btn-ghost rounded-xl px-5 py-2.5 text-sm">
          Check wallet
        </Link>
        <Link href="/x402" className="btn-ghost rounded-xl px-5 py-2.5 text-sm">
          x402
        </Link>
        <Link href="/skill.md" className="btn-ghost rounded-xl px-5 py-2.5 text-sm">
          Read skill.md
        </Link>
      </div>
    </div>
  );
}
