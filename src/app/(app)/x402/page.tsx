"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { apiFetch, getToken } from "@/lib/client-auth";

export default function X402Page() {
  const [info, setInfo] = useState<Record<string, unknown> | null>(null);
  const [stats, setStats] = useState<Record<string, unknown> | null>(null);
  const [amount, setAmount] = useState("");
  const [token, setToken] = useState("SOL");
  const [payerAddress, setPayerAddress] = useState("");
  const [endpoint, setEndpoint] = useState("");
  const [txSignature, setTxSignature] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const authed = !!getToken();

  useEffect(() => {
    (async () => {
      const i = await apiFetch("/api/x402?action=info");
      if (i.res.ok) setInfo(i.data);
      const s = await apiFetch("/api/x402?action=stats");
      if (s.res.ok) setStats(s.data);
    })();
  }, []);

  async function record(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    setError(null);
    if (!getToken()) {
      setError("Login required to record a payment");
      return;
    }
    const { res, data } = await apiFetch("/api/x402", {
      method: "POST",
      body: JSON.stringify({
        amount,
        token,
        payerAddress: payerAddress || undefined,
        endpoint: endpoint || undefined,
        txSignature: txSignature || undefined,
      }),
    });
    if (!res.ok) {
      setError(data.error || "Record failed");
      return;
    }
    setMsg(data.message || `Recorded ${data.id}`);
    setAmount("");
    setTxSignature("");
    const s = await apiFetch("/api/x402?action=stats");
    if (s.res.ok) setStats(s.data);
  }

  const freeEndpoints = Array.isArray(info?.freeEndpoints)
    ? (info!.freeEndpoints as string[])
    : [];

  return (
    <div>
      <h1 className="font-display text-3xl font-extrabold">x402</h1>
      <p className="mt-2 max-w-2xl text-sm text-mist">
        WindAgents exposes x402 <strong className="text-frost">info</strong> and voluntary{" "}
        <strong className="text-frost">payment records</strong>. Registration, skills, wallet
        balance, and read endpoints stay free — this is not a paywall.
      </p>

      <div className="mt-6 grid gap-4 md:grid-cols-2">
        <div className="glass rounded-2xl p-5">
          <p className="font-mono text-[10px] uppercase tracking-widest text-mist">Protocol</p>
          <p className="mt-2 font-display text-xl font-bold text-cyan">
            {String(info?.protocol || "x402")}
          </p>
          <p className="mt-2 text-xs text-mist">{String(info?.note || "")}</p>
          <p className="mt-3 font-mono text-[10px] text-mist">
            status: {String(info?.status || "—")}
          </p>
        </div>
        <div className="glass rounded-2xl p-5">
          <p className="font-mono text-[10px] uppercase tracking-widest text-mist">Records</p>
          <p className="mt-2 font-display text-2xl font-bold text-frost">
            {stats ? String(stats.count ?? stats.totalRecords ?? 0) : "—"}
          </p>
          <p className="mt-2 text-xs text-mist">Voluntary POST /api/x402 rows (authenticated).</p>
        </div>
      </div>

      {freeEndpoints.length > 0 && (
        <section className="glass mt-6 rounded-2xl p-5">
          <h2 className="font-display text-lg font-bold">Free endpoints (documented)</h2>
          <ul className="mt-3 space-y-1 font-mono text-[11px] text-mist">
            {freeEndpoints.map((ep) => (
              <li key={ep}>{ep}</li>
            ))}
          </ul>
        </section>
      )}

      <section className="glass mt-8 max-w-lg space-y-3 rounded-2xl p-6">
        <h2 className="font-display text-xl font-bold">Record a payment</h2>
        {!authed && (
          <p className="text-xs text-amber">
            <Link href="/login" className="underline">
              Login
            </Link>{" "}
            or{" "}
            <Link href="/register" className="underline">
              register
            </Link>{" "}
            to POST a record.
          </p>
        )}
        {error && <p className="text-sm text-ember">{error}</p>}
        {msg && <p className="text-sm text-cyan">{msg}</p>}
        <form onSubmit={record} className="space-y-3">
          <label className="block text-xs text-mist">
            Amount
            <input
              className="input-forge mt-1 font-mono text-xs"
              required
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.01"
            />
          </label>
          <label className="block text-xs text-mist">
            Token
            <input
              className="input-forge mt-1 font-mono text-xs"
              value={token}
              onChange={(e) => setToken(e.target.value)}
            />
          </label>
          <label className="block text-xs text-mist">
            Payer address (optional)
            <input
              className="input-forge mt-1 font-mono text-xs"
              value={payerAddress}
              onChange={(e) => setPayerAddress(e.target.value)}
            />
          </label>
          <label className="block text-xs text-mist">
            Endpoint (optional)
            <input
              className="input-forge mt-1 font-mono text-xs"
              value={endpoint}
              onChange={(e) => setEndpoint(e.target.value)}
              placeholder="/api/…"
            />
          </label>
          <label className="block text-xs text-mist">
            Tx signature (optional)
            <input
              className="input-forge mt-1 font-mono text-xs"
              value={txSignature}
              onChange={(e) => setTxSignature(e.target.value)}
            />
          </label>
          <button
            className="btn-cyan w-full rounded-xl py-2 text-sm disabled:opacity-40"
            disabled={!authed}
          >
            Record via POST /api/x402
          </button>
        </form>
      </section>

      <p className="mt-6 text-xs text-mist">
        Also see{" "}
        <Link href="/integrations" className="text-cyan underline">
          Integrations
        </Link>{" "}
        ·{" "}
        <Link href="/settings" className="text-cyan underline">
          Settings
        </Link>
      </p>
    </div>
  );
}
