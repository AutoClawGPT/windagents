"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { apiFetch, getToken } from "@/lib/client-auth";

export default function PortfolioPage() {
  const [data, setData] = useState<Record<string, unknown> | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!getToken()) {
      setError("Login required — portfolio uses your wallets + agents.");
      return;
    }
    (async () => {
      const { res, data: d } = await apiFetch("/api/portfolio");
      if (!res.ok) {
        setError(d.message || d.error || "Failed");
        return;
      }
      setData(d);
    })();
  }, []);

  const wallets = (data?.wallets || []) as {
    address: string;
    sol?: { sol?: number; lamports?: number; provider?: string; error?: string };
    tokens?: { mint: string; amount: number | null }[] | { error: string };
  }[];
  const agents = (data?.agents || []) as { id: string; name: string; status: string; walletAddress?: string }[];

  return (
    <div>
      <h1 className="font-display text-3xl font-extrabold">Portfolio</h1>
      <p className="mt-2 text-sm text-mist">
        Real SOL (+ optional SPL) balances for your user/payout and agent wallets.
      </p>
      {error && (
        <div className="mt-6 rounded-2xl border border-ember/40 bg-ember/10 p-4 text-sm text-ember">
          {error}{" "}
          <Link href="/login" className="underline">
            Login
          </Link>
        </div>
      )}
      {data && (
        <>
          <p className="mt-4 font-mono text-[10px] text-cyan/80">{String(data.note || "")}</p>
          <h2 className="mt-8 font-display text-xl font-bold">Wallets</h2>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            {wallets.map((w) => (
              <div key={w.address} className="glass rounded-2xl p-5">
                <p className="truncate font-mono text-[10px] text-mist">{w.address}</p>
                {w.sol?.error ? (
                  <p className="mt-2 text-sm text-ember">{w.sol.error}</p>
                ) : (
                  <p className="mt-2 font-display text-3xl font-bold text-cyan">
                    {w.sol?.sol != null ? w.sol.sol.toFixed(4) : "—"}{" "}
                    <span className="text-base text-mist">SOL</span>
                  </p>
                )}
                <p className="mt-1 font-mono text-[9px] text-mist">
                  via {w.sol?.provider || "rpc"}
                </p>
                {Array.isArray(w.tokens) && w.tokens.length > 0 && (
                  <ul className="mt-3 space-y-1 font-mono text-[10px] text-mist">
                    {w.tokens.slice(0, 8).map((t) => (
                      <li key={t.mint}>
                        {t.amount ?? 0} · {t.mint.slice(0, 8)}…
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
            {wallets.length === 0 && (
              <div className="glass rounded-2xl p-6 text-sm text-mist">
                No wallets on file — set payout wallet in{" "}
                <Link href="/settings" className="text-cyan underline">
                  Settings
                </Link>
                .
              </div>
            )}
          </div>
          <h2 className="mt-10 font-display text-xl font-bold">Agents</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {agents.map((a) => (
              <Link key={a.id} href={`/agents/${a.id}`} className="glass rounded-xl p-4 hover:border-cyan/40">
                <p className="font-display font-bold">{a.name}</p>
                <p className="font-mono text-[10px] text-mist">{a.status}</p>
              </Link>
            ))}
            {agents.length === 0 && (
              <p className="text-sm text-mist">No agents yet.</p>
            )}
          </div>
        </>
      )}
    </div>
  );
}
