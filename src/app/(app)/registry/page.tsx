"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { apiFetch, getToken } from "@/lib/client-auth";

type Rep = {
  id: string;
  userId: string;
  agentId?: string | null;
  displayName?: string;
  type?: string;
  trustTier: string;
  reputationScore: number;
  totalTrades: number;
  totalLaunches: number;
  totalBounties: number;
};

export default function RegistryPage() {
  const [board, setBoard] = useState<Rep[]>([]);
  const [mine, setMine] = useState<Rep | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch("/api/registry");
      const data = await res.json();
      setBoard(data.leaderboard || []);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function register() {
    if (!getToken()) {
      setError("Login required");
      return;
    }
    const { res, data } = await apiFetch("/api/registry", {
      method: "POST",
      body: JSON.stringify({ action: "register" }),
    });
    if (!res.ok) {
      setError(data.error || "Failed");
      return;
    }
    setMine(data.reputation);
    setMsg(data.message || "Registered");
    await load();
  }

  async function bump() {
    if (!getToken()) return;
    const { res, data } = await apiFetch("/api/registry", {
      method: "POST",
      body: JSON.stringify({ action: "update", trades: 1 }),
    });
    if (!res.ok) {
      setError(data.error || "Update failed");
      return;
    }
    setMine(data.reputation);
    setMsg("Score updated (+trade)");
    await load();
  }

  return (
    <div>
      <h1 className="font-display text-3xl font-extrabold">Agent Registry</h1>
      <p className="mt-2 text-sm text-mist">
        Reputation tiers: unrated → bronze → silver → gold → platinum.
      </p>
      <div className="mt-6 flex flex-wrap gap-2">
        <button onClick={register} className="btn-cyan rounded-xl px-4 py-2 text-sm">
          Register me
        </button>
        <button onClick={bump} className="btn-ghost rounded-xl px-4 py-2 text-sm">
          Log +1 trade
        </button>
        <Link href="/leaderboard" className="btn-ghost rounded-xl px-4 py-2 text-sm">
          View leaderboard
        </Link>
      </div>
      {msg && <p className="mt-3 text-sm text-cyan">{msg}</p>}
      {error && <p className="mt-3 text-sm text-ember">{error}</p>}
      {mine && (
        <div className="glass mt-6 rounded-2xl p-5 font-mono text-xs">
          Your tier: <span className="text-amber">{mine.trustTier}</span> · score{" "}
          <span className="text-cyan">{mine.reputationScore}</span> · trades {mine.totalTrades} ·
          launches {mine.totalLaunches}
        </div>
      )}
      <div className="mt-8 grid gap-3">
        {board.map((r) => {
          const href = r.agentId ? `/agents/${r.agentId}` : `/agents/${r.userId}`;
          return (
            <div key={r.id} className="glass flex items-center justify-between rounded-xl px-4 py-3">
              <Link href={href} className="font-display text-sm font-semibold text-frost hover:text-cyan hover:underline">
                {r.displayName || `${r.userId.slice(0, 10)}…`}
              </Link>
              <span className="font-mono text-xs text-amber">{r.trustTier}</span>
              <span className="font-mono text-sm text-cyan">{r.reputationScore}</span>
            </div>
          );
        })}
        {loading && (
          <div className="glass rounded-2xl p-8 text-center text-sm text-mist">Loading registry…</div>
        )}
        {!loading && board.length === 0 && (
          <div className="glass rounded-2xl p-8 text-center text-sm text-mist">Registry empty.</div>
        )}
      </div>
    </div>
  );
}
