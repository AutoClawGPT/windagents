"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { apiFetch, getToken, useAuthReady } from "@/lib/client-auth";
import { THREE_WS_PUMP_FUN_SKILLS } from "@/lib/clawpump-skills";

type VenueCard = {
  id: "pump" | "pons" | "claw" | "self-funded" | "pools";
  title: string;
  api: string;
  blurb: string;
  href: string;
};

const VENUES: VenueCard[] = [
  {
    id: "pump",
    title: "Pump.fun",
    api: "Partner POST /api/launch",
    blurb: "Solana bonding-curve tokenize via ClawPump Partner. Confirm desk posts selfFunded launches.",
    href: "/launch?venue=pump",
  },
  {
    id: "self-funded",
    title: "Self-funded",
    api: "GET+POST /api/launch/self-funded",
    blurb: "External wallet quote → pay → retry with preflightToken. x402 USDC path supported upstream.",
    href: "/launch?venue=self-funded",
  },
  {
    id: "pons",
    title: "PONS",
    api: "POST /api/launch/pons",
    blurb: "EVM payout (0x) venue. Requires payoutWallet on Confirm.",
    href: "/launch?venue=pons",
  },
  {
    id: "pools",
    title: "Pools",
    api: "POST /api/launch/pools",
    blurb: "Uniswap via pools.trade. Pass Idempotency-Key on retries.",
    href: "/launch?venue=pools",
  },
  {
    id: "claw",
    title: "Claw",
    api: "POST /api/launch/claw",
    blurb: "Partner /launch path (payment may be required). Gasless first-3 is retired.",
    href: "/launch?venue=claw",
  },
];

function rememberVenue(id: VenueCard["id"]) {
  try {
    sessionStorage.setItem("windagents_launch_venue", id);
  } catch {
    /* ignore */
  }
}

export function ClawPumpTechPanel() {
  const authed = useAuthReady();
  const [hasCpk, setHasCpk] = useState<boolean | null>(null);
  const [checking, setChecking] = useState(false);
  const [fees, setFees] = useState<unknown>(null);
  const [feesError, setFeesError] = useState<string | null>(null);
  const [feeAgentId, setFeeAgentId] = useState("");
  const [mcpInfo, setMcpInfo] = useState<unknown>(null);
  const [mcpTools, setMcpTools] = useState<unknown>(null);
  const [mcpBusy, setMcpBusy] = useState(false);
  const [mcpError, setMcpError] = useState<string | null>(null);

  const loadCpk = useCallback(async () => {
    if (!getToken()) {
      setHasCpk(false);
      return;
    }
    setChecking(true);
    const { res, data } = await apiFetch("/api/settings");
    setChecking(false);
    setHasCpk(res.ok ? !!data?.keys?.hasClawpump : false);
  }, []);

  useEffect(() => {
    if (authed === null) return;
    if (!authed) {
      setHasCpk(false);
      return;
    }
    loadCpk();
  }, [authed, loadCpk]);

  const ready = !!authed && hasCpk === true;
  const missingAuth = authed === false || (authed === true && hasCpk === false);

  async function loadFees() {
    if (!hasCpk) {
      setFeesError("Connect cpk_ in Settings to fetch fees");
      setFees(null);
      return;
    }
    if (!feeAgentId.trim()) {
      setFeesError("Enter a clawpumpAgentId (or linked Partner id)");
      return;
    }
    setFeesError(null);
    setFees(null);
    const { res, data } = await apiFetch(
      `/api/fees/earnings?agentId=${encodeURIComponent(feeAgentId.trim())}`
    );
    if (!res.ok) {
      setFeesError(data.message || data.error || `HTTP ${res.status}`);
      return;
    }
    setFees(data);
  }

  async function loadMcpInfo() {
    setMcpError(null);
    const { res, data } = await apiFetch("/api/clawpump/mcp");
    if (!res.ok) {
      setMcpError(data.error || "MCP GET failed");
      return;
    }
    setMcpInfo(data);
  }

  async function listMcpTools() {
    if (!getToken()) {
      setMcpError("Login required");
      return;
    }
    if (!hasCpk) {
      setMcpError("Connect cpk_ in Settings for tools/list");
      return;
    }
    setMcpBusy(true);
    setMcpError(null);
    const { res, data } = await apiFetch("/api/clawpump/mcp", {
      method: "POST",
      body: JSON.stringify({ method: "tools/list", params: {}, id: 1 }),
    });
    setMcpBusy(false);
    if (!res.ok) {
      setMcpError(data.message || data.error || `HTTP ${res.status}`);
      return;
    }
    setMcpTools(data);
  }

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="font-display text-2xl font-bold text-frost">ClawPump.tech</h2>
          <p className="mt-1 max-w-2xl text-sm text-mist">
            Optional Partner launch / tokenize via your own{" "}
            <code className="font-mono text-cyan">cpk_</code>. WindAgents proxies — never a shared
            platform key. Venues, Confirm, fees, and ClawPump MCP live here.
          </p>
        </div>
        <Link href="/launch" className="btn-cyan shrink-0 rounded-xl px-5 py-2.5 text-sm">
          Open Launch Confirm
        </Link>
      </div>

      <div className="mt-4 rounded-2xl border border-cyan/30 bg-cyan/10 px-4 py-3 text-sm text-cyan">
        This tab needs Bearer + Settings <code className="font-mono">cpk_</code>. The WindAgents
        desk tab does not.
      </div>

      {authed === null || checking ? (
        <p className="mt-6 font-mono text-xs text-mist">checking login / cpk_…</p>
      ) : missingAuth ? (
        <div className="glass mt-6 rounded-2xl border border-amber/40 p-5">
          <p className="font-display text-lg font-bold text-amber">Connect to launch</p>
          <p className="mt-2 text-sm text-mist">
            {!getToken() ? (
              <>
                Login with your WindAgents Bearer, then save your ClawPump{" "}
                <code className="font-mono text-cyan">cpk_</code> in Settings.
              </>
            ) : (
              <>
                Bearer OK — save your own <code className="font-mono text-cyan">cpk_</code> in
                Settings to hit Partner launch / MCP tools/list.
              </>
            )}
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            {!getToken() && (
              <Link href="/login" className="btn-ghost rounded-xl px-4 py-2 text-xs">
                Login
              </Link>
            )}
            <Link href="/settings" className="btn-cyan rounded-xl px-4 py-2 text-xs">
              Open Settings
            </Link>
          </div>
        </div>
      ) : (
        <p className="mt-6 font-mono text-[11px] text-cyan">
          Bearer + cpk_ ready — pick a venue or open Confirm.
        </p>
      )}

      <h3 className="font-display mt-10 text-xl font-bold">Venues</h3>
      <p className="mt-1 text-xs text-mist">
        Deep-link into Confirm with venue query + session hint. Existing APIs — no remix.
      </p>
      <div className="mt-4 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {VENUES.map((v) => (
          <Link
            key={v.id}
            href={v.href}
            onClick={() => rememberVenue(v.id)}
            className="glass block rounded-2xl p-5 transition hover:border-cyan/40"
          >
            <p className="font-display text-lg font-bold text-frost">{v.title}</p>
            <p className="mt-1 font-mono text-[10px] text-cyan">{v.api}</p>
            <p className="mt-2 text-xs text-mist">{v.blurb}</p>
            <p className="mt-3 font-mono text-[10px] text-amber">
              {ready ? "→ /launch" : "needs Bearer + cpk_"}
            </p>
          </Link>
        ))}
      </div>

      <div className="glass mt-8 rounded-2xl border border-cyan/20 p-5">
        <h3 className="font-display text-lg font-bold">Self-funded / fees</h3>
        <p className="mt-1 text-xs text-mist">
          Gasless first-3 is retired — Confirm may require self-funded payment. Fees:{" "}
          <code className="text-cyan">GET /api/fees/earnings?agentId=</code> (needs cpk_).
        </p>
        <div className="mt-3 flex flex-wrap items-end gap-2">
          <label className="block min-w-[200px] flex-1 text-xs text-mist">
            Partner agentId
            <input
              className="input-forge mt-1 font-mono text-xs"
              value={feeAgentId}
              onChange={(e) => setFeeAgentId(e.target.value)}
              placeholder="clawpumpAgentId"
              disabled={!hasCpk}
            />
          </label>
          <button
            type="button"
            disabled={!hasCpk}
            onClick={loadFees}
            className="btn-ghost rounded-xl px-4 py-2 text-xs disabled:opacity-50"
          >
            Fetch earnings
          </button>
        </div>
        {feesError && <p className="mt-2 text-xs text-amber">{feesError}</p>}
        {fees != null && (
          <pre className="mt-2 max-h-40 overflow-auto rounded-xl bg-void/50 p-3 font-mono text-[10px] text-mist">
            {JSON.stringify(fees, null, 2)}
          </pre>
        )}
      </div>

      <div className="glass mt-6 rounded-2xl border border-cyan/20 p-5">
        <h3 className="font-display text-lg font-bold">ClawPump MCP (read-only)</h3>
        <p className="mt-1 text-xs text-mist">
          GET /api/clawpump/mcp · POST tools/list — uses your Settings cpk_ only. Route stays
          intact; PayBox MCP unchanged.
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={loadMcpInfo}
            className="btn-ghost rounded-xl px-4 py-2 text-xs"
          >
            GET info
          </button>
          <button
            type="button"
            disabled={mcpBusy || !hasCpk}
            onClick={listMcpTools}
            className="btn-cyan rounded-xl px-4 py-2 text-xs disabled:opacity-50"
          >
            {mcpBusy ? "Listing…" : "POST tools/list"}
          </button>
          {!hasCpk && (
            <Link href="/settings" className="btn-ghost rounded-xl px-4 py-2 text-xs">
              Save cpk_ first
            </Link>
          )}
        </div>
        {mcpError && <p className="mt-2 text-xs text-amber">{mcpError}</p>}
        {mcpInfo != null && (
          <pre className="mt-2 max-h-32 overflow-auto rounded-xl bg-void/50 p-3 font-mono text-[10px] text-mist">
            {JSON.stringify(mcpInfo, null, 2)}
          </pre>
        )}
        {mcpTools != null && (
          <pre className="mt-2 max-h-48 overflow-auto rounded-xl bg-void/50 p-3 font-mono text-[10px] text-mist">
            {JSON.stringify(mcpTools, null, 2)}
          </pre>
        )}
      </div>

      <section className="mt-10">
        <h3 className="font-display text-xl font-bold">three.ws pump-fun packs</h3>
        <p className="mt-1 max-w-2xl text-xs text-mist">
          Install into your <strong className="text-frost">agent runtime</strong> — not executed by
          the WindAgents server.
        </p>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          {THREE_WS_PUMP_FUN_SKILLS.map((s) => (
            <a
              key={s.slug}
              href={s.installUrl}
              target="_blank"
              rel="noreferrer"
              className="glass block rounded-2xl p-4 transition hover:border-cyan/40"
            >
              <p className="font-display text-base font-bold text-frost">{s.name}</p>
              <p className="mt-1 font-mono text-[10px] text-cyan">
                {s.slug.replace(/^threews-/, "")}
              </p>
              <p className="mt-2 text-xs text-mist">{s.description}</p>
              <p className="mt-3 font-mono text-[10px] text-amber">raw SKILL.md ↗</p>
            </a>
          ))}
        </div>
      </section>

      <section className="glass mt-10 rounded-2xl p-6">
        <h3 className="font-display text-xl font-bold">Partner skill: token-launch</h3>
        <p className="mt-2 text-sm text-mist">
          Enable ClawPump Partner <code className="font-mono text-cyan">token-launch</code> when
          you have <code className="font-mono text-cyan">cpk_</code> — live catalogue on Skills.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <Link
            href="/skills"
            className={
              hasCpk
                ? "btn-cyan rounded-xl px-4 py-2 text-xs"
                : "btn-ghost rounded-xl px-4 py-2 text-xs"
            }
          >
            Open Skills → token-launch
          </Link>
          {!hasCpk && (
            <Link href="/settings" className="btn-ghost rounded-xl px-4 py-2 text-xs">
              Save cpk_ first
            </Link>
          )}
        </div>
      </section>
    </div>
  );
}
