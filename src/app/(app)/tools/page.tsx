"use client";

import { useState } from "react";
import Link from "next/link";

type Json = unknown;

export default function ToolsPage() {
  const [chain, setChain] = useState("solana");
  const [limit, setLimit] = useState(12);
  const [query, setQuery] = useState("");
  const [address, setAddress] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [result, setResult] = useState<Json>(null);
  const [error, setError] = useState<string | null>(null);
  const [cards, setCards] = useState<
    { address?: string; name?: string; symbol?: string; image?: string | null; price?: number | null }[]
  >([]);

  async function call(path: string, body: Record<string, unknown>, label: string) {
    setBusy(label);
    setError(null);
    setResult(null);
    setCards([]);
    try {
      const res = await fetch(path, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.message || data.error || `HTTP ${res.status}`);
        setResult(data);
        return;
      }
      setResult(data);
      const items = (data.items || data.tokens || data.data || data.results || []) as Record<
        string,
        unknown
      >[];
      if (Array.isArray(items) && items.length) {
        setCards(
          items.slice(0, 24).map((t) => {
            const md = (t.marketData || {}) as Record<string, unknown>;
            return {
              address: String(t.address || t.mint || ""),
              name: String(t.name || "Unknown"),
              symbol: String(t.symbol || "?"),
              image: (t.image as string) || null,
              price: typeof md.price === "number" ? md.price : null,
            };
          })
        );
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Request failed");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div>
      <h1 className="font-display text-3xl font-extrabold">Token Tools</h1>
      <p className="mt-2 max-w-2xl text-sm text-mist">
        WindAgents desk for MoonPay Agents public tools — trending, search, retrieve. Live when
        upstream is reachable; failures return honest 502 JSON (never invented tokens).
      </p>
      <p className="mt-2 font-mono text-[10px] text-cyan/80">
        POST /api/tools/* · also see{" "}
        <Link href="/marketplace" className="underline">
          Marketplace
        </Link>
      </p>

      <div className="mt-8 grid gap-4 lg:grid-cols-3">
        <form
          className="glass space-y-3 rounded-2xl p-5"
          onSubmit={(e) => {
            e.preventDefault();
            call("/api/tools/token_trending_list", { chain, limit, page: 1 }, "trending");
          }}
        >
          <h2 className="font-display text-lg font-bold text-cyan">Trending</h2>
          <label className="block text-xs text-mist">
            Chain
            <input className="input-forge mt-1" value={chain} onChange={(e) => setChain(e.target.value)} />
          </label>
          <label className="block text-xs text-mist">
            Limit
            <input
              type="number"
              className="input-forge mt-1"
              value={limit}
              onChange={(e) => setLimit(Number(e.target.value) || 12)}
            />
          </label>
          <button disabled={!!busy} className="btn-cyan w-full rounded-xl py-2.5 text-sm disabled:opacity-50">
            {busy === "trending" ? "Loading…" : "Fetch trending"}
          </button>
        </form>

        <form
          className="glass space-y-3 rounded-2xl p-5"
          onSubmit={(e) => {
            e.preventDefault();
            call("/api/tools/token_search", { query, chain }, "search");
          }}
        >
          <h2 className="font-display text-lg font-bold text-amber">Search</h2>
          <label className="block text-xs text-mist">
            Query
            <input
              className="input-forge mt-1"
              required
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="SOL, BONK…"
            />
          </label>
          <button disabled={!!busy} className="btn-ghost w-full rounded-xl py-2.5 text-sm disabled:opacity-50">
            {busy === "search" ? "Searching…" : "Search tokens"}
          </button>
        </form>

        <form
          className="glass space-y-3 rounded-2xl p-5"
          onSubmit={(e) => {
            e.preventDefault();
            call("/api/tools/token_retrieve", { address, chain }, "retrieve");
          }}
        >
          <h2 className="font-display text-lg font-bold">Retrieve</h2>
          <label className="block text-xs text-mist">
            Address / mint
            <input
              className="input-forge mt-1 font-mono text-xs"
              required
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="So1111…"
            />
          </label>
          <button disabled={!!busy} className="btn-ghost w-full rounded-xl py-2.5 text-sm disabled:opacity-50">
            {busy === "retrieve" ? "Loading…" : "Retrieve token"}
          </button>
        </form>
      </div>

      {error && <p className="mt-4 text-sm text-ember">{error}</p>}

      {cards.length > 0 && (
        <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {cards.map((t, i) => (
            <div key={(t.address || "") + i} className="glass rounded-2xl p-4">
              <div className="flex items-center gap-3">
                {t.image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={t.image} alt="" className="h-9 w-9 rounded-full object-cover" />
                ) : (
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-cyan/10 font-mono text-[10px] text-cyan">
                    {(t.symbol || "?").slice(0, 3)}
                  </div>
                )}
                <div className="min-w-0">
                  <p className="truncate font-display font-bold">{t.symbol}</p>
                  <p className="truncate text-xs text-mist">{t.name}</p>
                </div>
              </div>
              <p className="mt-2 font-mono text-[10px] text-mist">
                {t.price != null ? `$${t.price}` : "price —"}
              </p>
              <p className="mt-1 truncate font-mono text-[9px] text-mist/60">{t.address}</p>
            </div>
          ))}
        </div>
      )}

      {result != null && (
        <pre className="glass mt-8 max-h-[420px] overflow-auto rounded-2xl p-4 font-mono text-[11px]">
          {JSON.stringify(result, null, 2)}
        </pre>
      )}
    </div>
  );
}
