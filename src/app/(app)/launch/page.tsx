"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { apiFetch, getToken } from "@/lib/client-auth";

type RemoteAgent = {
  id: string;
  name: string;
  status?: string;
  walletAddress?: string | null;
  skills?: string[];
  persona?: string | null;
};

type LocalAgent = {
  id: string;
  name: string;
  clawpumpAgentId?: string | null;
  walletAddress?: string | null;
};

type Venue = "pump" | "pons" | "claw" | "self-funded" | "pools";

type PumpPair = {
  mint?: string;
  quoteMint?: string;
  symbol?: string;
  name?: string;
  label?: string;
  [key: string]: unknown;
};

type CreatorFeeBps = { min?: number; max?: number; default?: number };

function normalizeRemote(raw: unknown): RemoteAgent[] {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw as RemoteAgent[];
  if (typeof raw === "object" && raw !== null) {
    const o = raw as { agents?: RemoteAgent[]; data?: RemoteAgent[] };
    if (Array.isArray(o.agents)) return o.agents;
    if (Array.isArray(o.data)) return o.data;
  }
  return [];
}

function normalizePumpPairs(raw: unknown): { pairs: PumpPair[]; feeBps: CreatorFeeBps | null } {
  if (!raw || typeof raw !== "object") return { pairs: [], feeBps: null };
  const o = raw as Record<string, unknown>;
  const feeBps =
    o.creatorFeeBps && typeof o.creatorFeeBps === "object"
      ? (o.creatorFeeBps as CreatorFeeBps)
      : null;
  let pairs: PumpPair[] = [];
  if (Array.isArray(o.pairs)) pairs = o.pairs as PumpPair[];
  else if (Array.isArray(o.pumpPairs)) pairs = o.pumpPairs as PumpPair[];
  else if (Array.isArray(o.data)) pairs = o.data as PumpPair[];
  else if (Array.isArray(raw)) pairs = raw as PumpPair[];
  return { pairs, feeBps };
}

function pairMint(p: PumpPair): string {
  return String(p.mint || p.quoteMint || "").trim();
}

function pairLabel(p: PumpPair): string {
  const mint = pairMint(p);
  const short = mint ? `${mint.slice(0, 4)}…${mint.slice(-4)}` : "?";
  return String(p.label || p.symbol || p.name || short);
}

export default function LaunchPage() {
  const [venue, setVenue] = useState<Venue>("pump");
  const [step, setStep] = useState<"form" | "confirm">("form");
  const [remoteAgents, setRemoteAgents] = useState<RemoteAgent[]>([]);
  const [localAgents, setLocalAgents] = useState<LocalAgent[]>([]);
  const [clawConnected, setClawConnected] = useState(false);
  const [clawError, setClawError] = useState<string | null>(null);
  const [agentId, setAgentId] = useState("");
  const [name, setName] = useState("");
  const [symbol, setSymbol] = useState("");
  const [description, setDescription] = useState("");
  const [payoutWallet, setPayoutWallet] = useState("");
  const [logoUrl, setLogoUrl] = useState("https://clawpump.tech/claw-token.webp");
  const [selfFunded, setSelfFunded] = useState(true);
  const [mode, setMode] = useState("paid");
  const [busy, setBusy] = useState(false);
  const [loadingAgents, setLoadingAgents] = useState(true);
  const [result, setResult] = useState<unknown>(null);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<number | null>(null);

  const [pumpPairs, setPumpPairs] = useState<PumpPair[]>([]);
  const [feeBpsMeta, setFeeBpsMeta] = useState<CreatorFeeBps | null>(null);
  const [pumpQuoteMint, setPumpQuoteMint] = useState("");
  const [pumpCreatorFeeBps, setPumpCreatorFeeBps] = useState("");
  const [pairsError, setPairsError] = useState<string | null>(null);

  // Self-funded quote → pay → retry
  const [sfWallet, setSfWallet] = useState("");
  const [sfAgentName, setSfAgentName] = useState("");
  const [preflightToken, setPreflightToken] = useState("");
  const [amountLamports, setAmountLamports] = useState<string | null>(null);
  const [payTo, setPayTo] = useState<string | null>(null);
  const [txSignature, setTxSignature] = useState("");

  /** Partner-facing id currently in the selector (clawpump id preferred). */
  const selected = useMemo(() => {
    const remote = remoteAgents.find((a) => a.id === agentId);
    if (remote) return remote;
    const local = localAgents.find(
      (a) => a.clawpumpAgentId === agentId || a.id === agentId
    );
    if (local) {
      return {
        id: local.clawpumpAgentId || local.id,
        name: local.name,
        walletAddress: local.walletAddress,
        skills: undefined as string[] | undefined,
        persona: undefined as string | null | undefined,
        status: undefined as string | undefined,
        localId: local.id,
        clawpumpAgentId: local.clawpumpAgentId || null,
        isLocal: true as const,
      };
    }
    return null;
  }, [remoteAgents, localAgents, agentId]);

  const selectedLocalOnly = useMemo(() => {
    if (!agentId) return false;
    if (remoteAgents.some((a) => a.id === agentId)) return false;
    const local = localAgents.find((a) => a.id === agentId || a.clawpumpAgentId === agentId);
    if (!local) return false;
    return !local.clawpumpAgentId;
  }, [agentId, remoteAgents, localAgents]);

  const selectedPairIsCustom = useMemo(() => {
    if (!pumpQuoteMint) return false;
    const pair = pumpPairs.find((p) => pairMint(p) === pumpQuoteMint);
    if (!pair) return true;
    const sym = String(pair.symbol || pair.name || pair.label || "").toUpperCase();
    // Wrapped SOL / native SOL pairs cannot set creator fee
    return !(sym === "SOL" || sym === "WSOL" || sym.includes("WRAPPED SOL"));
  }, [pumpQuoteMint, pumpPairs]);

  async function loadAgents() {
    if (!getToken()) {
      setError("Login with your WindAgents Bearer, then save cpk_ in Settings");
      setLoadingAgents(false);
      return;
    }
    setLoadingAgents(true);
    setError(null);
    const { res, data } = await apiFetch("/api/agents");
    setLoadingAgents(false);
    if (!res.ok) {
      setError(data.error || data.message || "Failed to load agents");
      return;
    }
    const locals: LocalAgent[] = data.agents || [];
    setLocalAgents(locals);
    const connected = !!data.clawpump?.connected;
    setClawConnected(connected);
    if (!connected) {
      setClawError(data.clawpump?.message || "Connect cpk_ in Settings to pull ClawPump agents");
      setRemoteAgents([]);
      setAgentId((prev) => {
        if (prev) return prev;
        const linked = locals.find((a) => a.clawpumpAgentId);
        if (linked?.clawpumpAgentId) return linked.clawpumpAgentId;
        if (locals[0]?.id) return locals[0].id;
        return "";
      });
      return;
    }
    setClawError(data.clawpump?.error || null);
    const remote = normalizeRemote(data.clawpump?.remote);
    setRemoteAgents(remote);
    // Prefer session pref, else linked local clawpumpAgentId, else first remote, else first local id
    setAgentId((prev) => {
      if (prev) return prev;
      const linked = locals.find((a) => a.clawpumpAgentId);
      if (linked?.clawpumpAgentId) return linked.clawpumpAgentId;
      if (remote[0]?.id) return remote[0].id;
      if (locals[0]?.id) return locals[0].id;
      return "";
    });
  }

  async function loadPumpPairs() {
    if (!getToken()) return;
    setPairsError(null);
    const { res, data } = await apiFetch("/api/launch/pump-pairs");
    if (!res.ok) {
      setPairsError(data.message || data.error || `pump-pairs HTTP ${res.status}`);
      setPumpPairs([]);
      return;
    }
    const { pairs, feeBps } = normalizePumpPairs(data);
    setPumpPairs(pairs);
    setFeeBpsMeta(feeBps);
    if (feeBps?.default != null && !pumpCreatorFeeBps) {
      setPumpCreatorFeeBps(String(feeBps.default));
    }
  }

  useEffect(() => {
    try {
      const pref = sessionStorage.getItem("windagents_launch_agent");
      if (pref) setAgentId(pref);
      const q = new URLSearchParams(window.location.search).get("venue");
      const sess = sessionStorage.getItem("windagents_launch_venue");
      const raw = (q || sess || "").toLowerCase();
      if (raw === "pump" || raw === "pons" || raw === "claw" || raw === "self-funded" || raw === "pools") {
        setVenue(raw as Venue);
        sessionStorage.setItem("windagents_launch_venue", raw);
      }
    } catch {}
    loadAgents();
    loadPumpPairs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (selected?.walletAddress && (venue === "pump" || venue === "self-funded") && !payoutWallet) {
      setPayoutWallet(selected.walletAddress);
    }
    if (selected?.walletAddress && venue === "self-funded" && !sfWallet) {
      setSfWallet(selected.walletAddress);
    }
    if (selected?.name && venue === "self-funded" && !sfAgentName) {
      setSfAgentName(selected.name);
    }
  }, [selected, venue, payoutWallet, sfWallet, sfAgentName]);

  function goConfirm(e: React.FormEvent) {
    e.preventDefault();
    if (!agentId) {
      setError("Pick a WindAgents / ClawPump agent first");
      return;
    }
    if (selectedLocalOnly) {
      setError(
        "This local WindAgents agent has no clawpumpAgentId. Connect cpk_ in Settings and create/sync so Partner launch uses a real id — never call Partner with a fake id."
      );
      return;
    }
    if (!symbol.trim() || !description.trim()) {
      setError("Symbol and description required");
      return;
    }
    if (venue === "pons" && !/^0x[a-fA-F0-9]{40}$/.test(payoutWallet.trim())) {
      setError("PONS payoutWallet must be a 0x EVM address");
      return;
    }
    if (venue === "self-funded") {
      setError("Use Preflight → pay → Retry for self-funded (not Confirm)");
      return;
    }
    setError(null);
    setStep("confirm");
  }

  async function confirmLaunch() {
    if (!getToken()) {
      setError("Login required");
      return;
    }
    if (selectedLocalOnly) {
      setError(
        "Local agent is not linked to ClawPump. Sync via cpk_ before Partner launch — no fake ids."
      );
      return;
    }
    setBusy(true);
    setError(null);
    setResult(null);
    setStatus(null);

    let path = "/api/launch";
    let body: Record<string, unknown> = {
      agentId,
      name: name || symbol,
      symbol,
      description,
      imageUrl: logoUrl,
      logoUrl,
      payoutWallet: payoutWallet || undefined,
      selfFunded,
    };
    if (venue === "pump") {
      if (pumpQuoteMint) body.pumpQuoteMint = pumpQuoteMint;
      if (selectedPairIsCustom && pumpCreatorFeeBps) {
        body.pumpCreatorFeeBps = Number(pumpCreatorFeeBps);
      }
    }
    if (venue === "pons") {
      path = "/api/launch/pons";
      body = { agentId, name: name || symbol, symbol, description, payoutWallet, logoUrl };
    } else if (venue === "pools") {
      path = "/api/launch/pools";
      body = {
        agentId,
        name: name || symbol,
        symbol,
        description: description || undefined,
        logoUrl: logoUrl || undefined,
        imageUrl: logoUrl || undefined,
        payoutWallet: payoutWallet || undefined,
      };
    } else if (venue === "claw") {
      path = "/api/launch/claw";
      body = {
        agentId,
        name: name || symbol,
        symbol,
        description,
        logoUrl,
        mode: mode === "paid" ? "paid" : "paid",
        selfFunded: mode === "paid",
      };
      if (pumpQuoteMint) body.pumpQuoteMint = pumpQuoteMint;
    }

    const { res, data } = await apiFetch(path, { method: "POST", body: JSON.stringify(body) });
    setBusy(false);
    setStatus(res.status);
    setResult(data);
    if (!res.ok) {
      setError(
        data.message ||
          data.error ||
          (data.pay || data.selfFunded
            ? "Payment required — see response (not faked)"
            : `HTTP ${res.status}`)
      );
    } else {
      setStep("form");
    }
  }

  async function poll() {
    if (!getToken() || !agentId) return;
    setBusy(true);
    setError(null);
    // Pump + claw poll agent tokenAddress via /api/launch/claw — not PONS
    const path =
      venue === "pons"
        ? `/api/launch/pons?agentId=${encodeURIComponent(agentId)}`
        : `/api/launch/claw?agentId=${encodeURIComponent(agentId)}`;
    const { res, data } = await apiFetch(path);
    setBusy(false);
    setStatus(res.status);
    setResult(data);
    if (!res.ok) setError(data.message || data.error || `HTTP ${res.status}`);
  }

  async function selfFundedPreflight() {
    if (!getToken()) {
      setError("Login required");
      return;
    }
    if (selectedLocalOnly) {
      setError(
        "Local agent has no clawpumpAgentId — connect cpk_ and sync before self-funded launch."
      );
      return;
    }
    if (!agentId || !symbol.trim() || !description.trim()) {
      setError("agentId, symbol, description required for preflight");
      return;
    }
    const wallet = sfWallet || selected?.walletAddress || payoutWallet;
    if (!wallet) {
      setError("walletAddress required (payer + 75% beneficiary)");
      return;
    }
    setBusy(true);
    setError(null);
    setResult(null);
    setStatus(null);
    const body: Record<string, unknown> = {
      preflight: true,
      name: name || symbol,
      symbol,
      description,
      imageUrl: logoUrl,
      agentId,
      agentName: sfAgentName || selected?.name || name || symbol,
      walletAddress: wallet,
    };
    if (pumpQuoteMint) body.quoteMint = pumpQuoteMint;

    const { res, data } = await apiFetch("/api/launch/self-funded", {
      method: "POST",
      body: JSON.stringify(body),
    });
    setBusy(false);
    setStatus(res.status);
    setResult(data);
    if (!res.ok) {
      setError(data.message || data.error || `HTTP ${res.status}`);
      return;
    }
    const payment = (data as { payment?: Record<string, unknown> })?.payment;
    const retry = (data as { retryWith?: { preflightToken?: string } })?.retryWith;
    if (payment?.amountLamports != null) setAmountLamports(String(payment.amountLamports));
    if (payment?.payTo) setPayTo(String(payment.payTo));
    if (retry?.preflightToken) setPreflightToken(String(retry.preflightToken));
    else if ((data as { preflightToken?: string }).preflightToken) {
      setPreflightToken(String((data as { preflightToken: string }).preflightToken));
    }
  }

  async function selfFundedRetry() {
    if (!getToken()) {
      setError("Login required");
      return;
    }
    if (!txSignature.trim() || !preflightToken.trim()) {
      setError("Paste txSignature and keep preflightToken from the quote");
      return;
    }
    const wallet = sfWallet || selected?.walletAddress || payoutWallet;
    setBusy(true);
    setError(null);
    setResult(null);
    setStatus(null);
    const body: Record<string, unknown> = {
      name: name || symbol,
      symbol,
      description,
      imageUrl: logoUrl,
      agentId,
      agentName: sfAgentName || selected?.name || name || symbol,
      walletAddress: wallet,
      txSignature: txSignature.trim(),
      preflightToken: preflightToken.trim(),
    };
    if (pumpQuoteMint) body.quoteMint = pumpQuoteMint;

    const { res, data } = await apiFetch("/api/launch/self-funded", {
      method: "POST",
      body: JSON.stringify(body),
    });
    setBusy(false);
    setStatus(res.status);
    setResult(data);
    if (!res.ok) {
      setError(
        data.message ||
          data.error ||
          (res.status === 402 ? "Payment required — see response (not faked)" : `HTTP ${res.status}`)
      );
    }
  }

  return (
    <div>
      <h1 className="font-display text-3xl font-extrabold">Launch Confirm</h1>
      <p className="mt-2 max-w-2xl text-sm text-mist">
        Confirm desk for coin launch (hub:{" "}
        <Link href="/tokenize" className="text-cyan underline">
          /tokenize
        </Link>
        ). Pick a live agent (Bearer + Settings{" "}
        <code className="text-cyan">cpk_</code>), fill required fields (logoUrl, payout), then Confirm.
        Calls existing WindAgents launch APIs only — payment_required responses stay honest (no fake
        mints). Claw venue proxies Partner <code className="text-cyan">POST /launch</code> (payment may
        be required; gasless first-3 is retired).{" "}
        <Link href="/settings" className="text-cyan underline">
          Settings
        </Link>{" "}
        ·{" "}
        <Link href="/agents" className="text-cyan underline">
          Agents
        </Link>{" "}
        ·{" "}
        <Link href="/skills" className="text-cyan underline">
          Skills
        </Link>
      </p>
      <p className="mt-2 font-mono text-[10px] text-mist">
        Venue deep-links:{" "}
        <code className="text-cyan">?venue=pump|pons|claw|self-funded|pools</code> from the Tokenize hub.
      </p>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => {
            loadAgents();
            loadPumpPairs();
          }}
          disabled={loadingAgents}
          className="btn-ghost rounded-xl px-3 py-1.5 text-xs disabled:opacity-50"
        >
          {loadingAgents ? "Refreshing…" : "Refresh local + ClawPump agents + pairs"}
        </button>
        <span className="font-mono text-[10px] text-mist">
          {loadingAgents
            ? "checking cpk_ / loading ClawPump agents…"
            : clawConnected
              ? `cpk_ connected · ${localAgents.length} local · ${remoteAgents.length} remote · ${pumpPairs.length} pump pair(s)`
              : `cpk_ not connected · ${localAgents.length} local — save key in Settings to sync Partner`}
        </span>
      </div>
      {clawError && (
        <p className="mt-3 rounded-xl border border-amber/30 bg-amber/10 px-4 py-2 text-xs text-amber">
          {clawError}
        </p>
      )}
      {pairsError && (
        <p className="mt-2 rounded-xl border border-amber/30 bg-amber/10 px-4 py-2 text-xs text-amber">
          pump-pairs: {pairsError}
        </p>
      )}

      <div className="mt-6 flex flex-wrap gap-2">
        {(
          [
            ["pump", "Pump.fun tokenize"],
            ["pons", "PONS"],
            ["claw", "Claw / Partner launch"],
            ["self-funded", "Self-funded quote"],
            ["pools", "Pools (Uniswap)"],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => {
              setVenue(id);
              setStep("form");
              setResult(null);
              setError(null);
            }}
            className={
              venue === id
                ? "btn-cyan rounded-xl px-4 py-2 text-xs"
                : "btn-ghost rounded-xl px-4 py-2 text-xs"
            }
          >
            {label}
          </button>
        ))}
      </div>

      {step === "form" && (
        <form onSubmit={goConfirm} className="glass mt-6 max-w-xl space-y-3 rounded-2xl p-6">
          <label className="block text-xs text-mist">
            Agent (local WindAgents first-class)
            <select
              className="input-forge mt-1 font-mono text-xs"
              required
              value={agentId}
              onChange={(e) => setAgentId(e.target.value)}
            >
              <option value="">
                {localAgents.length || remoteAgents.length
                  ? "Select agent…"
                  : "No agents — create on /tokenize or connect cpk_"}
              </option>
              {localAgents.length > 0 && (
                <optgroup label="Local WindAgents">
                  {localAgents.map((a) => {
                    const value = a.clawpumpAgentId || a.id;
                    const linked = a.clawpumpAgentId
                      ? `linked ${a.clawpumpAgentId.slice(0, 8)}…`
                      : "NOT LINKED";
                    return (
                      <option key={`local-${a.id}`} value={value}>
                        {a.name} · {a.id.slice(0, 8)}… · {linked}
                      </option>
                    );
                  })}
                </optgroup>
              )}
              {remoteAgents.length > 0 && (
                <optgroup label="ClawPump remote">
                  {remoteAgents.map((a) => (
                    <option key={`remote-${a.id}`} value={a.id}>
                      {a.name} · {a.status || "?"} · {a.id.slice(0, 8)}…
                    </option>
                  ))}
                </optgroup>
              )}
            </select>
          </label>
          {selected && (
            <p className="rounded-lg border border-cyan/20 bg-void/40 px-3 py-2 font-mono text-[10px] text-mist">
              partnerId {selected.id} · wallet {selected.walletAddress || "—"} · skills{" "}
              {(selected.skills || []).slice(0, 6).join(", ") || "—"}
            </p>
          )}
          {selectedLocalOnly && (
            <p className="rounded-xl border border-amber/40 bg-amber/10 px-3 py-2 text-[11px] text-amber">
              Local-only agent — no <code className="font-mono">clawpumpAgentId</code>. Connect{" "}
              <code className="font-mono">cpk_</code> in Settings, then create/sync via{" "}
              <Link href="/tokenize#wa-agents" className="underline text-cyan">
                Agents desk
              </Link>{" "}
              before Partner launch. WindAgents will not call Partner with a fake id.
            </p>
          )}

          <label className="block text-xs text-mist">
            Name
            <input className="input-forge mt-1" value={name} onChange={(e) => setName(e.target.value)} />
          </label>
          <label className="block text-xs text-mist">
            Symbol / ticker
            <input
              className="input-forge mt-1"
              required
              maxLength={12}
              value={symbol}
              onChange={(e) => setSymbol(e.target.value)}
            />
          </label>
          <label className="block text-xs text-mist">
            Description
            <textarea
              className="input-forge mt-1 min-h-[72px]"
              required
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </label>
          <label className="block text-xs text-mist">
            {venue === "pons"
              ? "Payout wallet (0x EVM)"
              : venue === "pools"
                ? "Builder payout wallet (optional)"
                : "Payout wallet (Solana, optional)"}
            <input
              className="input-forge mt-1 font-mono text-xs"
              required={venue === "pons"}
              value={payoutWallet}
              onChange={(e) => setPayoutWallet(e.target.value)}
              placeholder={venue === "pons" ? "0x…" : "defaults to agent wallet"}
            />
          </label>
          <p className="rounded-lg border border-cyan/20 bg-void/40 px-3 py-2 text-[10px] text-mist">
            Required: agent · symbol · description · logoUrl (https/ipfs). PONS also needs 0x payoutWallet.
            Optional Solana payout defaults to agent wallet. Never invents paid success. Claw = Partner
            paid launch (not gasless).
          </p>
          <label className="block text-xs text-mist">
            Logo / image URL
            <input
              className="input-forge mt-1 font-mono text-xs"
              required
              value={logoUrl}
              onChange={(e) => setLogoUrl(e.target.value)}
            />
          </label>

          {(venue === "pump" || venue === "claw" || venue === "self-funded") && (
            <label className="block text-xs text-mist">
              Pump quote pair (from GET /api/launch/pump-pairs)
              <select
                className="input-forge mt-1 font-mono text-xs"
                value={pumpQuoteMint}
                onChange={(e) => setPumpQuoteMint(e.target.value)}
              >
                <option value="">Wrapped SOL (default)</option>
                {pumpPairs.map((p) => {
                  const mint = pairMint(p);
                  if (!mint) return null;
                  return (
                    <option key={mint} value={mint}>
                      {pairLabel(p)} · {mint.slice(0, 8)}…
                    </option>
                  );
                })}
              </select>
            </label>
          )}
          {(venue === "pump" || venue === "claw") && selectedPairIsCustom && (
            <label className="block text-xs text-mist">
              Creator fee bps (custom pairs only; {feeBpsMeta?.min ?? 100}–{feeBpsMeta?.max ?? 300})
              <input
                className="input-forge mt-1 font-mono text-xs"
                type="number"
                min={feeBpsMeta?.min ?? 100}
                max={feeBpsMeta?.max ?? 300}
                value={pumpCreatorFeeBps}
                onChange={(e) => setPumpCreatorFeeBps(e.target.value)}
              />
            </label>
          )}

          {venue === "pump" && (
            <label className="flex items-center gap-2 text-xs text-mist">
              <input
                type="checkbox"
                checked={selfFunded}
                onChange={(e) => setSelfFunded(e.target.checked)}
              />
              selfFunded (pay from agent SOL wallet via POST /launch)
            </label>
          )}
          {venue === "claw" && (
            <label className="block text-xs text-mist">
              Funding
              <select className="input-forge mt-1" value={mode} onChange={(e) => setMode(e.target.value)}>
                <option value="paid">paid (Partner POST /launch — payment may be required)</option>
              </select>
              <span className="mt-1 block text-[10px] text-amber">
                Gasless / sponsored first-3 is retired upstream. Use paid or Self-funded quote.
              </span>
            </label>
          )}

          {venue === "self-funded" && (
            <div className="space-y-3 rounded-xl border border-cyan/30 bg-void/50 p-3">
              <p className="text-[11px] text-mist">
                External-wallet path: Preflight → send exactly{" "}
                <code className="text-cyan">amountLamports</code> to{" "}
                <code className="text-cyan">payTo</code> → paste{" "}
                <code className="text-cyan">txSignature</code> → Retry (same body + preflightToken).
              </p>
              <label className="block text-xs text-mist">
                walletAddress (payer + beneficiary)
                <input
                  className="input-forge mt-1 font-mono text-xs"
                  value={sfWallet}
                  onChange={(e) => setSfWallet(e.target.value)}
                  placeholder="Solana base58"
                />
              </label>
              <label className="block text-xs text-mist">
                agentName
                <input
                  className="input-forge mt-1"
                  value={sfAgentName}
                  onChange={(e) => setSfAgentName(e.target.value)}
                />
              </label>
              {(amountLamports || payTo || preflightToken) && (
                <dl className="space-y-1 font-mono text-[10px] text-cyan">
                  {amountLamports && (
                    <div className="flex justify-between gap-2">
                      <dt>amountLamports</dt>
                      <dd className="break-all text-frost">{amountLamports}</dd>
                    </div>
                  )}
                  {payTo && (
                    <div className="flex justify-between gap-2">
                      <dt>payTo</dt>
                      <dd className="break-all text-frost">{payTo}</dd>
                    </div>
                  )}
                  {preflightToken && (
                    <div className="flex justify-between gap-2">
                      <dt>preflightToken</dt>
                      <dd className="max-w-[60%] break-all text-frost">{preflightToken}</dd>
                    </div>
                  )}
                </dl>
              )}
              <label className="block text-xs text-mist">
                txSignature (after paying)
                <input
                  className="input-forge mt-1 font-mono text-xs"
                  value={txSignature}
                  onChange={(e) => setTxSignature(e.target.value)}
                  placeholder="paste Solana tx signature"
                />
              </label>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  disabled={busy || !agentId}
                  onClick={selfFundedPreflight}
                  className="btn-cyan rounded-xl px-4 py-2 text-xs disabled:opacity-50"
                >
                  {busy ? "…" : "1. Preflight quote"}
                </button>
                <button
                  type="button"
                  disabled={busy || !txSignature || !preflightToken}
                  onClick={selfFundedRetry}
                  className="btn-ghost rounded-xl px-4 py-2 text-xs disabled:opacity-50"
                >
                  {busy ? "…" : "2. Retry with proof"}
                </button>
              </div>
            </div>
          )}

          {venue === "pools" && (
            <p className="rounded-xl border border-cyan/20 bg-cyan/5 px-3 py-2 text-[11px] text-mist">
              Uniswap via pools.trade — <code className="text-cyan">POST /api/launch/pools</code>.
              Send <code className="text-cyan">Idempotency-Key</code> on API retries. Payment-required
              responses pass through honestly. Real mint needs your{" "}
              <code className="text-cyan">cpk_</code>.
            </p>
          )}

          <div className="flex flex-wrap gap-2 pt-2">
            {venue !== "self-funded" && (
              <button type="submit" className="btn-cyan rounded-xl px-5 py-2.5 text-sm">
                Review launch
              </button>
            )}
            <button
              type="button"
              disabled={busy || !agentId}
              onClick={poll}
              className="btn-ghost rounded-xl px-5 py-2.5 text-sm disabled:opacity-50"
            >
              Poll status
            </button>
          </div>
        </form>
      )}

      {step === "confirm" && (
        <div className="glass mt-6 max-w-xl space-y-4 rounded-2xl p-6">
          <h2 className="font-display text-xl font-bold text-cyan">Confirm launch</h2>
          <dl className="space-y-2 font-mono text-[11px] text-mist">
            <div className="flex justify-between gap-4">
              <dt>Venue</dt>
              <dd className="text-frost">{venue}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt>Agent</dt>
              <dd className="text-right text-frost">
                {selected?.name || agentId}
                <br />
                <span className="text-[10px] opacity-70">{agentId}</span>
              </dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt>Token</dt>
              <dd className="text-frost">
                {name || symbol} / {symbol}
              </dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt>Payout</dt>
              <dd className="break-all text-right text-frost">{payoutWallet || "(agent default)"}</dd>
            </div>
            {venue === "pump" && (
              <>
                <div className="flex justify-between gap-4">
                  <dt>selfFunded</dt>
                  <dd className="text-frost">{String(selfFunded)}</dd>
                </div>
                {pumpQuoteMint && (
                  <div className="flex justify-between gap-4">
                    <dt>pumpQuoteMint</dt>
                    <dd className="break-all text-right text-frost">{pumpQuoteMint}</dd>
                  </div>
                )}
                {selectedPairIsCustom && pumpCreatorFeeBps && (
                  <div className="flex justify-between gap-4">
                    <dt>pumpCreatorFeeBps</dt>
                    <dd className="text-frost">{pumpCreatorFeeBps}</dd>
                  </div>
                )}
              </>
            )}
            {venue === "claw" && (
              <div className="flex justify-between gap-4">
                <dt>funding</dt>
                <dd className="text-frost">paid (Partner /launch)</dd>
              </div>
            )}
          </dl>
          <p className="text-[11px] text-amber">
            ClawPump may return payment_required / LAUNCH_PAYMENT_REQUIRED — we show that honestly and never
            invent a mint.
          </p>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={busy}
              onClick={confirmLaunch}
              className="btn-cyan rounded-xl px-5 py-2.5 text-sm disabled:opacity-50"
            >
              {busy ? "Launching…" : "Confirm"}
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => setStep("form")}
              className="btn-ghost rounded-xl px-5 py-2.5 text-sm"
            >
              Back
            </button>
          </div>
        </div>
      )}

      {status != null && <p className="mt-4 font-mono text-[11px] text-cyan">HTTP {status}</p>}
      {error && <p className="mt-2 text-sm text-ember">{error}</p>}
      {result != null && (
        <pre className="glass mt-4 max-h-[480px] overflow-auto rounded-2xl p-4 font-mono text-[11px]">
          {JSON.stringify(result, null, 2)}
        </pre>
      )}
    </div>
  );
}
