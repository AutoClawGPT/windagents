"use client";

import { useEffect, useState } from "react";
import { apiFetch, getToken, useAuthReady } from "@/lib/client-auth";
import Link from "next/link";

export default function PayboxPage() {
  const authed = useAuthReady();
  const [info, setInfo] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(true);
  const [result, setResult] = useState<unknown>(null);
  const [error, setError] = useState<string | null>(null);

  const connected = info?.connected === true;

  useEffect(() => {
    if (authed === null) return;
    if (authed === false) {
      setError("Login required");
      setLoading(false);
      return;
    }
    (async () => {
      setLoading(true);
      const { res, data } = await apiFetch("/api/paybox?action=info");
      if (res.ok) setInfo(data);
      else setError(data.message || data.error || "PayBox error");
      setLoading(false);
    })();
  }, [authed]);

  async function run(action: string) {
    if (!connected) return;
    setError(null);
    setResult(null);
    const { res, data } = await apiFetch(`/api/paybox?action=${action}`);
    if (!res.ok) {
      setError(data.message || data.error || "Failed — connect pbx_ in Settings");
      setResult(data);
      return;
    }
    setResult(data);
  }

  return (
    <div>
      <h1 className="font-display text-3xl font-extrabold">PayBox</h1>
      <p className="mt-2 text-sm text-mist">
        Non-custodial MCP wallets. Requires your own <code className="text-cyan">pbx_</code> key — no demo vault.
        WindAgents actions: credentials, portfolio, policies, spend-limit, sign, completeRequest, poll.
      </p>

      {loading && <p className="mt-6 text-sm text-mist">Loading PayBox status…</p>}

      {!loading && info && info.connected === false && (
        <div className="mt-6 rounded-2xl border border-amber/40 bg-amber/10 p-5">
          <p className="font-display text-lg font-bold text-amber">PayBox not connected</p>
          <p className="mt-2 text-sm text-mist">
            Add your own <code className="text-cyan">pbx_</code> API key in Settings → Accounts, then return here.
            WindAgents never invents balances or vaults.
          </p>
          <Link href="/settings" className="btn-cyan mt-4 inline-flex rounded-xl px-5 py-2.5 text-sm">
            Open Settings → add pbx_
          </Link>
          {typeof info.message === "string" && info.message && (
            <p className="mt-3 font-mono text-[10px] text-mist">{info.message}</p>
          )}
        </div>
      )}

      {info && connected && (
        <div className="glass mt-6 rounded-2xl p-4 font-mono text-[11px] text-mist">
          connected: true · {String(info.message || "pbx_ ready")}
        </div>
      )}

      {error && authed !== false && (
        <p className="mt-4 text-sm text-ember">
          {error}{" "}
          <Link href="/settings" className="underline">
            Settings
          </Link>
        </p>
      )}
      {authed === false && (
        <p className="mt-4 text-sm text-amber">
          <Link href="/login" className="underline">
            Login
          </Link>{" "}
          with agent Bearer, then add pbx_ in Settings.
        </p>
      )}

      <div className="mt-6 flex flex-wrap gap-2">
        {["credentials", "tools", "services", "policies", "spend-limit", "portfolio"].map((a) => (
          <button
            key={a}
            onClick={() => run(a)}
            disabled={!connected}
            title={!connected ? "Connect pbx_ in Settings first" : a}
            className="btn-ghost rounded-xl px-4 py-2 text-xs disabled:cursor-not-allowed disabled:opacity-40"
          >
            {a}
          </button>
        ))}
        <button
          type="button"
          disabled={!connected}
          className="btn-ghost rounded-xl px-4 py-2 text-xs disabled:cursor-not-allowed disabled:opacity-40"
          onClick={async () => {
            if (!connected) return;
            setError(null);
            setResult(null);
            const { res, data } = await apiFetch("/api/paybox", {
              method: "POST",
              body: JSON.stringify({ action: "sign", arguments: { message: "windagents-ping" } }),
            });
            if (!res.ok) {
              setError(data.message || data.error || "sign failed");
              setResult(data);
              return;
            }
            setResult(data);
          }}
        >
          sign (POST)
        </button>
      </div>
      {result != null && (
        <pre className="glass mt-6 max-h-96 overflow-auto rounded-2xl p-4 font-mono text-[11px]">
          {JSON.stringify(result, null, 2)}
        </pre>
      )}
    </div>
  );
}
