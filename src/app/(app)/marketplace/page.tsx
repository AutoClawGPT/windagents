"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type Token = {
  address: string;
  name: string;
  symbol: string;
  image?: string | null;
  price?: number | null;
  marketCap?: number | null;
  volume24h?: number | null;
  priceChange24h?: number | null;
  source: string;
};

export default function MarketplacePage() {
  const [tokens, setTokens] = useState<Token[]>([]);
  const [meta, setMeta] = useState<{ source?: string; note?: string; emptyPrices?: boolean }>({});
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/marketplace");
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed");
        setTokens(data.tokens || []);
        setMeta({ source: data.source, note: data.note, emptyPrices: data.emptyPrices });
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <div>
      <h1 className="font-display text-3xl font-extrabold">Marketplace</h1>
      <p className="mt-2 max-w-2xl text-sm text-mist">
        Live Solana token cards from MoonPay Agents trending. Prices are never invented — empty
        cells mean the feed had no quote. Deeper search/retrieve on the{" "}
        <Link href="/tools" className="text-cyan underline">Token Tools</Link> desk.
      </p>
      {meta.note && (
        <p className="mt-3 font-mono text-[10px] text-cyan/80">
          source: {meta.source} · {meta.note}
        </p>
      )}
      {error && <p className="mt-4 text-sm text-ember">{error}</p>}
      {loading && <p className="mt-8 text-sm text-mist">Loading market…</p>}
      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {tokens.map((t) => (
          <div key={t.address} className="glass rounded-2xl p-4">
            <div className="flex items-start gap-3">
              {t.image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={t.image} alt="" className="h-10 w-10 rounded-full bg-slate object-cover" />
              ) : (
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-cyan/10 font-mono text-xs text-cyan">
                  {t.symbol.slice(0, 3)}
                </div>
              )}
              <div className="min-w-0 flex-1">
                <p className="font-display text-lg font-bold truncate">{t.symbol}</p>
                <p className="truncate text-xs text-mist">{t.name}</p>
              </div>
              {t.priceChange24h != null && (
                <span
                  className={
                    t.priceChange24h >= 0 ? "font-mono text-xs text-cyan" : "font-mono text-xs text-ember"
                  }
                >
                  {(t.priceChange24h * 100).toFixed(1)}%
                </span>
              )}
            </div>
            <div className="mt-4 grid grid-cols-2 gap-2 font-mono text-[10px] text-mist">
              <div>
                <p className="uppercase tracking-widest">Price</p>
                <p className="mt-0.5 text-frost">
                  {t.price != null ? `$${t.price < 0.01 ? t.price.toExponential(2) : t.price.toFixed(4)}` : "—"}
                </p>
              </div>
              <div>
                <p className="uppercase tracking-widest">Mcap</p>
                <p className="mt-0.5 text-frost">
                  {t.marketCap != null ? `$${(t.marketCap / 1e6).toFixed(2)}M` : "—"}
                </p>
              </div>
            </div>
            <p className="mt-3 truncate font-mono text-[9px] text-mist/70">{t.address}</p>
            <Link
              href={`/terminal?out=${t.address}`}
              className="mt-3 inline-block text-xs text-cyan hover:underline"
            >
              Quote on swap desk →
            </Link>
          </div>
        ))}
      </div>
      {!loading && tokens.length === 0 && (
        <div className="glass mt-8 rounded-2xl p-8 text-center text-sm text-mist">
          No tokens available. Check MoonPay connectivity or set WIND_MINT / AGENT_MINT.
        </div>
      )}
    </div>
  );
}
