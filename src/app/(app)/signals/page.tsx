"use client";

import { useEffect, useState } from "react";

type Signal = {
  id?: string;
  type: string;
  source: string;
  tokenSymbol?: string | null;
  tokenMint?: string | null;
  message: string;
  price?: string | null;
  confidence?: number | null;
  createdAt?: string;
};

export default function SignalsPage() {
  const [signals, setSignals] = useState<Signal[]>([]);
  const [status, setStatus] = useState<Record<string, unknown> | null>(null);
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const res = await fetch("/api/signals");
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed");
        setSignals(data.signals || []);
        setStatus(data.status || null);
        setNote(data.note || "");
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const tone = (t: string) =>
    t === "buy" ? "text-cyan border-cyan/30 bg-cyan/10" :
    t === "sell" ? "text-ember border-ember/30 bg-ember/10" :
    "text-amber border-amber/30 bg-amber/10";

  return (
    <div>
      <h1 className="font-display text-3xl font-extrabold">Signals</h1>
      <p className="mt-2 text-sm text-mist">
        Live trending mapped to buy/hold/sell cues — backed by MoonPay when reachable.
      </p>
      {note && <p className="mt-3 font-mono text-[10px] text-cyan/80">{note}</p>}
      {status && (
        <div className="glass mt-4 flex flex-wrap gap-4 rounded-2xl p-4 font-mono text-[10px]">
          <span>
            Jupiter:{" "}
            <span className={status.jupiter === "ok" ? "text-cyan" : "text-ember"}>
              {String(status.jupiter)}
            </span>
          </span>
          <span>Helius key: {status.heliusConfigured ? "yes" : "no (public RPC)"}</span>
          <span className="truncate text-mist">{String(status.rpc)}</span>
        </div>
      )}
      {error && <p className="mt-4 text-sm text-ember">{error}</p>}
      <div className="mt-8 space-y-3">
        {signals.map((s, i) => (
          <div key={s.id || i} className="glass flex gap-4 rounded-2xl p-4">
            <span className={`h-fit rounded-lg border px-2 py-1 font-mono text-[10px] uppercase ${tone(s.type)}`}>
              {s.type}
            </span>
            <div className="min-w-0 flex-1">
              <p className="font-display text-base font-bold">
                {s.tokenSymbol || "SIGNAL"}{" "}
                {s.price && <span className="font-mono text-xs font-normal text-mist">${s.price}</span>}
              </p>
              <p className="mt-1 text-sm text-mist">{s.message}</p>
              <p className="mt-2 font-mono text-[9px] text-mist/60">
                {s.source}
                {s.confidence != null ? ` · conf ${s.confidence}` : ""}
                {s.tokenMint ? ` · ${s.tokenMint.slice(0, 8)}…` : ""}
              </p>
            </div>
          </div>
        ))}
        {loading && (
          <div className="glass rounded-2xl p-8 text-center text-sm text-mist">Loading signals…</div>
        )}
        {!loading && signals.length === 0 && (
          <div className="glass rounded-2xl p-8 text-center text-sm text-mist">
            No live signals yet. Jupiter/wallet status above reflects real connectivity.
          </div>
        )}
      </div>
    </div>
  );
}
