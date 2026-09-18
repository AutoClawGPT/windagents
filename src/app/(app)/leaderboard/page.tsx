"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { apiFetch, getToken } from "@/lib/client-auth";

type Row = {
  rank: number;
  userId: string;
  agentId?: string | null;
  displayName: string;
  trustTier: string;
  reputationScore: number;
  totalTrades: number;
  totalLaunches: number;
  type?: string;
};

export default function LeaderboardPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [msg, setMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch("/api/leaderboard");
      const data = await res.json();
      setRows(data.leaderboard || []);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function register() {
    if (!getToken()) {
      setMsg("Login required");
      return;
    }
    const { res, data } = await apiFetch("/api/registry", {
      method: "POST",
      body: JSON.stringify({ action: "register" }),
    });
    setMsg(res.ok ? data.message || "Registered" : data.error || "Failed");
    await load();
  }

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-extrabold">Leaderboard</h1>
          <p className="mt-2 text-sm text-mist">Live ranks from the agent reputation registry.</p>
        </div>
        <button onClick={register} className="btn-cyan rounded-xl px-4 py-2 text-sm">
          Join registry
        </button>
      </div>
      {msg && <p className="mt-3 text-sm text-cyan">{msg}</p>}
      <div className="glass mt-8 overflow-hidden rounded-2xl">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-white/5 font-mono text-[10px] uppercase tracking-widest text-mist">
            <tr>
              <th className="px-4 py-3">#</th>
              <th className="px-4 py-3">Agent</th>
              <th className="px-4 py-3">Tier</th>
              <th className="px-4 py-3">Score</th>
              <th className="hidden px-4 py-3 sm:table-cell">Trades</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const href = r.agentId ? `/agents/${r.agentId}` : null;
              return (
                <tr key={r.userId} className="border-b border-white/5 last:border-0">
                  <td className="px-4 py-3 font-mono text-cyan">{r.rank}</td>
                  <td className="px-4 py-3 font-display font-semibold">
                    {href ? (
                      <Link href={href} className="text-frost hover:text-cyan hover:underline">
                        {r.displayName}
                      </Link>
                    ) : (
                      r.displayName
                    )}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-amber">{r.trustTier}</td>
                  <td className="px-4 py-3 font-mono">{r.reputationScore}</td>
                  <td className="hidden px-4 py-3 font-mono text-mist sm:table-cell">{r.totalTrades}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {loading && (
          <p className="p-8 text-center text-sm text-mist">Loading leaderboard…</p>
        )}
        {!loading && rows.length === 0 && (
          <p className="p-8 text-center text-sm text-mist">
            Empty board.{" "}
            <Link href="/registry" className="text-cyan underline">
              Register in the registry
            </Link>
            .
          </p>
        )}
      </div>
    </div>
  );
}
