"use client";

import { useState } from "react";

export default function WalletPage() {
  const [address, setAddress] = useState("");
  const [data, setData] = useState<unknown>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function load(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setData(null);
    try {
      const res = await fetch(`/api/wallet/balance?address=${encodeURIComponent(address)}&tokens=1`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Balance failed");
      setData(json);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <h1 className="font-display text-3xl font-extrabold">Wallet</h1>
      <p className="mt-2 text-sm text-mist">Live Helius / public RPC balances. Never mocked.</p>
      <form onSubmit={load} className="glass mt-8 flex flex-col gap-3 rounded-2xl p-5 sm:flex-row">
        <input
          className="input-forge flex-1 font-mono text-xs"
          required
          placeholder="Solana address"
          value={address}
          onChange={(e) => setAddress(e.target.value)}
        />
        <button disabled={busy} className="btn-cyan rounded-xl px-6 py-2 text-sm disabled:opacity-50">
          {busy ? "Reading…" : "Fetch balance"}
        </button>
      </form>
      {error && <p className="mt-4 text-sm text-ember">{error}</p>}
      {data != null && (
        <pre className="glass mt-6 overflow-auto rounded-2xl p-4 font-mono text-[11px]">
          {JSON.stringify(data, null, 2)}
        </pre>
      )}
    </div>
  );
}
