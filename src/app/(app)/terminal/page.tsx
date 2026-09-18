"use client";

import { useState } from "react";
import Link from "next/link";
import { SOL_MINT, USDC_MINT } from "@/lib/utils";

export default function TerminalPage() {
  const [inputMint, setInputMint] = useState(SOL_MINT);
  const [outputMint, setOutputMint] = useState(USDC_MINT);
  const [amount, setAmount] = useState("1000000000");
  const [quote, setQuote] = useState<unknown>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function getQuote(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setQuote(null);
    try {
      const res = await fetch("/api/swap/quote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ inputMint, outputMint, amount }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Quote failed");
      setQuote(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <h1 className="font-display text-3xl font-extrabold">Swap desk</h1>
      <p className="mt-2 text-sm text-mist">
        Real Jupiter quotes — public, no mock fills. Token launches:{" "}
        <Link href="/launch" className="text-cyan underline">
          Launch desk (PONS + claw)
        </Link>
      </p>

      <form onSubmit={getQuote} className="glass mt-8 max-w-xl space-y-4 rounded-2xl p-6">
        <label className="block text-xs text-mist">
          Input mint
          <input className="input-forge mt-1 font-mono text-[11px]" value={inputMint} onChange={(e) => setInputMint(e.target.value)} />
        </label>
        <label className="block text-xs text-mist">
          Output mint
          <input className="input-forge mt-1 font-mono text-[11px]" value={outputMint} onChange={(e) => setOutputMint(e.target.value)} />
        </label>
        <label className="block text-xs text-mist">
          Amount (lamports / raw)
          <input className="input-forge mt-1 font-mono" value={amount} onChange={(e) => setAmount(e.target.value)} />
        </label>
        <button disabled={busy} className="btn-cyan w-full rounded-xl py-3 text-sm disabled:opacity-50">
          {busy ? "Quoting…" : "Get Jupiter quote"}
        </button>
      </form>

      {error && <p className="mt-4 text-sm text-ember">{error}</p>}
      {quote != null && (
        <pre className="glass mt-6 max-h-96 overflow-auto rounded-2xl p-4 font-mono text-[11px] text-frost/90">
          {JSON.stringify(quote, null, 2)}
        </pre>
      )}
    </div>
  );
}
