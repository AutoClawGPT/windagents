"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { apiFetch, getToken } from "@/lib/client-auth";

export default function AnalyticsPage() {
  const [data, setData] = useState<Record<string, unknown> | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const fetcher = getToken() ? apiFetch : async (p: string) => {
        const res = await fetch(p);
        return { res, data: await res.json() };
      };
      const { res, data: d } = await fetcher("/api/analytics");
      if (!res.ok) {
        setError(d.error || "Failed");
        return;
      }
      setData(d);
    })();
  }, []);

  const platform = (data?.platform || {}) as Record<string, number>;
  const me = data?.me as { userId: string; agentCount: number; wallet: unknown } | null;

  return (
    <div>
      <h1 className="font-display text-3xl font-extrabold">Analytics</h1>
      <p className="mt-2 text-sm text-mist">
        Platform counters from the live DB + optional wallet snapshot. No fabricated P&amp;L charts.
      </p>
      {error && <p className="mt-4 text-sm text-ember">{error}</p>}
      {data && (
        <>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[
              ["Users", platform.users],
              ["Agents", platform.agents],
              ["Running", platform.runningAgents],
              ["Open bounties", platform.bountiesOpen],
              ["Community posts", platform.communityPosts],
              ["Skills", platform.skills],
            ].map(([label, val]) => (
              <div key={String(label)} className="glass rounded-2xl p-5">
                <p className="font-mono text-[10px] uppercase tracking-widest text-mist">{label}</p>
                <p className="mt-2 font-display text-3xl font-bold text-cyan">{val ?? 0}</p>
              </div>
            ))}
          </div>
          {me ? (
            <div className="glass mt-8 rounded-2xl p-5">
              <p className="font-mono text-[10px] uppercase tracking-widest text-mist">Your slice</p>
              <p className="mt-2 text-sm">
                Agents: <span className="text-cyan">{me.agentCount}</span>
              </p>
              {me.wallet != null && (
                <pre className="mt-3 max-h-48 overflow-auto font-mono text-[10px] text-mist">
                  {JSON.stringify(me.wallet, null, 2)}
                </pre>
              )}
            </div>
          ) : (
            <p className="mt-6 text-sm text-amber">
              <Link href="/login" className="underline">
                Login
              </Link>{" "}
              for personal wallet analytics.
            </p>
          )}
          <p className="mt-4 font-mono text-[10px] text-mist">{String(data.note || "")}</p>
        </>
      )}
    </div>
  );
}
