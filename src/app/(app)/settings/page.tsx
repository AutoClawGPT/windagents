"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { apiFetch, clearAuth, getToken } from "@/lib/client-auth";
import { useRouter } from "next/navigation";

type KeysMask = {
  hasClawpump?: boolean;
  hasPaybox?: boolean;
  hasHelius?: boolean;
  hasSolanaRpc?: boolean;
  hasJupiterQuoteUrl?: boolean;
  hasJupiterApiKey?: boolean;
};

const INTEGRATIONS = [
  {
    href: "/tokenize",
    title: "Tokenize",
    note: "WindAgents desk (no cpk_) + ClawPump.tech tab (cpk_)",
  },
  {
    href: "/tokenize?tab=windagents",
    title: "Agents desk",
    note: "WindAgents registry — Bearer only",
  },
  {
    href: "/skills",
    title: "Skills",
    note: "Live ClawPump catalogue needs cpk_",
  },
  {
    href: "/tools",
    title: "Tools",
    note: "MoonPay Agents public tools (no key)",
  },
  {
    href: "/terminal",
    title: "Terminal",
    note: "Jupiter quotes public; execute gated",
  },
  {
    href: "/paybox",
    title: "PayBox",
    note: "Needs your pbx_",
  },
  {
    href: "/x402",
    title: "x402",
    note: "Info + voluntary payment records",
  },
  {
    href: "/community",
    title: "Community",
    note: "Public posts — no partner key",
  },
  {
    href: "/integrations",
    title: "Integrations hub",
    note: "Full capability map",
  },
];

export default function SettingsPage() {
  const router = useRouter();
  const [profile, setProfile] = useState<Record<string, unknown> | null>(null);
  const [displayName, setDisplayName] = useState("");
  const [cpk, setCpk] = useState("");
  const [pbx, setPbx] = useState("");
  const [wallet, setWallet] = useState("");
  const [moonpayEmail, setMoonpayEmail] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [verifyStatus, setVerifyStatus] = useState<Record<string, unknown> | null>(null);
  const [verifyCode, setVerifyCode] = useState<string | null>(null);
  const [verifyInstructions, setVerifyInstructions] = useState<string | null>(null);
  const [tweetUrl, setTweetUrl] = useState("");
  const [uploadMsg, setUploadMsg] = useState<string | null>(null);
  const [clawRemoteCount, setClawRemoteCount] = useState<number | null>(null);
  const [clawRemoteError, setClawRemoteError] = useState<string | null>(null);

  const keys = (profile?.keys || {}) as KeysMask;

  useEffect(() => {
    if (!getToken()) {
      setError("Login required");
      return;
    }
    (async () => {
      const { res, data } = await apiFetch("/api/settings");
      if (res.ok) {
        setProfile(data);
        setWallet(String(data.payoutWallet || ""));
        setDisplayName(String(data.displayName || ""));
        setMoonpayEmail(String(data.moonpayEmail || ""));
        if (data.keys?.hasClawpump) await refreshClawAgents();
      } else setError(data.error || "Failed");
      const v = await apiFetch("/api/verify");
      if (v.res.ok) setVerifyStatus(v.data);
    })();
  }, []);

  async function refreshClawAgents() {
    setClawRemoteError(null);
    const { res, data } = await apiFetch("/api/agents");
    if (!res.ok) {
      setClawRemoteError(data.error || data.message || "Could not list agents");
      setClawRemoteCount(null);
      return;
    }
    if (!data.clawpump?.connected) {
      setClawRemoteCount(null);
      setClawRemoteError(data.clawpump?.message || "cpk_ not connected");
      return;
    }
    const rem = data.clawpump?.remote;
    const list = Array.isArray(rem) ? rem : Array.isArray(rem?.agents) ? rem.agents : [];
    setClawRemoteCount(list.length);
    if (data.clawpump?.error) setClawRemoteError(String(data.clawpump.error));
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    setError(null);
    const body: Record<string, string> = {
      payoutWallet: wallet,
      displayName,
      moonpayEmail,
    };
    if (cpk) body.clawpumpApiKey = cpk;
    if (pbx) body.payboxApiKey = pbx;
    const { res, data } = await apiFetch("/api/settings", {
      method: "PUT",
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      setError(data.error || "Save failed");
      return;
    }
    setMsg(data.message || "Saved");
    setCpk("");
    setPbx("");
    setProfile((p) => ({
      ...p,
      keys: data.keys,
      displayName: data.displayName,
      moonpayEmail: data.moonpayEmail,
      payoutWallet: data.payoutWallet,
      walletAddress: data.walletAddress,
    }));
    if (data.keys?.hasClawpump) {
      await refreshClawAgents();
      setMsg((m) => (m || "Saved") + " — pulling ClawPump agents…");
    }
  }

  async function startVerify() {
    setError(null);
    const { res, data } = await apiFetch("/api/verify", {
      method: "POST",
      body: JSON.stringify({ action: "start" }),
    });
    if (!res.ok) {
      setError(data.error || data.message || "Verify start failed");
      return;
    }
    setVerifyCode(String(data.code || ""));
    setVerifyInstructions(String(data.instructions || ""));
    const v = await apiFetch("/api/verify");
    if (v.res.ok) setVerifyStatus(v.data);
  }

  async function confirmVerify(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const { res, data } = await apiFetch("/api/verify", {
      method: "POST",
      body: JSON.stringify({ action: "verify", tweetUrl }),
    });
    if (!res.ok) {
      setError(data.message || data.error || "Verify failed");
      return;
    }
    setMsg(data.message || "Verified");
    setVerifyStatus(data);
  }

  async function onUpload(file: File, kind: "image" | "banner") {
    setUploadMsg(null);
    setError(null);
    const reader = new FileReader();
    const dataUrl: string = await new Promise((resolve, reject) => {
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
    const { res, data } = await apiFetch("/api/upload", {
      method: "POST",
      body: JSON.stringify({ dataUrl, mime: file.type || "image/png", kind }),
    });
    if (!res.ok) {
      setError(data.error || "Upload failed");
      return;
    }
    setUploadMsg(`${kind} uploaded → ${data.url}`);
  }

  function Badge({ on, label }: { on?: boolean; label: string }) {
    return (
      <span
        className={`rounded-full border px-2 py-0.5 font-mono text-[10px] ${
          on
            ? "border-cyan/40 bg-cyan/10 text-cyan"
            : "border-amber/40 bg-amber/10 text-amber"
        }`}
      >
        {label}: {on ? "yes" : "no"}
      </span>
    );
  }

  return (
    <div className="pb-8">
      <h1 className="font-display text-3xl font-extrabold">Settings</h1>
      <p className="mt-2 max-w-2xl text-sm text-mist">
        Per-user vault — keys encrypted AES-256-GCM. GET never returns raw secrets. Registrants
        save cpk_ / pbx_ (+ profile). Helius / Jupiter / RPC are server env, not vault fields.
      </p>

      <div className="mt-4 rounded-2xl border border-cyan/30 bg-cyan/10 px-4 py-3 text-sm text-cyan">
        Every registrant uses their own keys — WindAgents never uses a shared platform ClawPump
        key.
      </div>

      {profile && (
        <div className="glass mt-6 flex flex-wrap gap-2 rounded-2xl p-4 font-mono text-[11px] text-mist">
          <span>id: {String(profile.id)}</span>
          <span>·</span>
          <span>type: {String(profile.type)}</span>
          <span>·</span>
          <span>email: {String(profile.email || "—")}</span>
          <div className="mt-2 flex w-full flex-wrap gap-2">
            <Badge on={keys.hasClawpump} label="hasClawpump" />
            <Badge on={keys.hasPaybox} label="hasPaybox" />
          </div>
        </div>
      )}

      {error && <p className="mt-4 text-sm text-ember">{error}</p>}
      {msg && <p className="mt-4 text-sm text-cyan">{msg}</p>}

      <form onSubmit={save} className="mt-8 space-y-6">
        {/* 1 Profile */}
        <section className="glass max-w-xl space-y-4 rounded-2xl p-6">
          <h2 className="font-display text-xl font-bold">1. Profile</h2>
          <label className="block text-xs text-mist">
            Display name
            <input
              className="input-forge mt-1"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Shown on public profile / community"
            />
          </label>
          <label className="block text-xs text-mist">
            Payout wallet
            <input
              className="input-forge mt-1 font-mono text-xs"
              value={wallet}
              onChange={(e) => setWallet(e.target.value)}
              placeholder="Solana address for rewards / payouts"
            />
          </label>
          {profile?.walletAddress != null && String(profile.walletAddress) !== "" && (
            <label className="block text-xs text-mist">
              Wallet address (readonly)
              <input
                className="input-forge mt-1 font-mono text-xs opacity-70"
                value={String(profile.walletAddress)}
                readOnly
              />
            </label>
          )}
        </section>

        {/* 2 ClawPump */}
        <section className="glass max-w-xl space-y-4 rounded-2xl p-6">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="font-display text-xl font-bold">2. ClawPump (your key)</h2>
            <Badge on={keys.hasClawpump} label="hasClawpump" />
          </div>
          <p className="text-xs text-mist">
            Get a <code className="text-cyan">cpk_</code> from{" "}
            <a
              href="https://clawpump.tech/dashboard/api"
              target="_blank"
              rel="noreferrer"
              className="text-cyan underline"
            >
              clawpump.tech/dashboard/api
            </a>
            . Leave blank to keep the existing vault entry.
          </p>
          <label className="block text-xs text-mist">
            ClawPump cpk_
            <input
              className="input-forge mt-1 font-mono text-xs"
              value={cpk}
              onChange={(e) => setCpk(e.target.value)}
              placeholder="cpk_…"
              autoComplete="off"
            />
          </label>
          {clawRemoteCount != null && (
            <p className="rounded-xl border border-cyan/30 bg-cyan/10 px-3 py-2 font-mono text-xs text-cyan">
              Remote agents: {clawRemoteCount}
            </p>
          )}
          {clawRemoteError && <p className="text-xs text-amber">{clawRemoteError}</p>}
          <div className="flex flex-wrap gap-3 text-xs">
            <Link href="/agents" className="text-cyan underline">
              Agents
            </Link>
            <Link href="/launch" className="text-cyan underline">
              Launch / Tokenize
            </Link>
            <Link href="/skills" className="text-cyan underline">
              Skills
            </Link>
            <button
              type="button"
              onClick={refreshClawAgents}
              className="btn-ghost rounded-lg px-2 py-1 text-[10px]"
            >
              Refresh remote count
            </button>
          </div>
        </section>

        {/* 3 PayBox */}
        <section className="glass max-w-xl space-y-4 rounded-2xl p-6">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="font-display text-xl font-bold">3. PayBox (your key)</h2>
            <Badge on={keys.hasPaybox} label="hasPaybox" />
          </div>
          <p className="text-xs text-mist">
            Get a <code className="text-cyan">pbx_</code> from{" "}
            <a
              href="https://app.paybox.sh"
              target="_blank"
              rel="noreferrer"
              className="text-cyan underline"
            >
              app.paybox.sh
            </a>
            .
          </p>
          <label className="block text-xs text-mist">
            PayBox pbx_
            <input
              className="input-forge mt-1 font-mono text-xs"
              value={pbx}
              onChange={(e) => setPbx(e.target.value)}
              placeholder="pbx_…"
              autoComplete="off"
            />
          </label>
          <Link href="/paybox" className="inline-block text-xs text-cyan underline">
            Open PayBox desk →
          </Link>
        </section>

        {/* 4 RPC note (server env — no user vault inputs) */}
        <section className="glass max-w-xl space-y-2 rounded-2xl p-6">
          <h2 className="font-display text-xl font-bold">4. RPC / Helius / Jupiter</h2>
          <p className="text-xs text-mist">
            Server operator sets{" "}
            <code className="text-cyan">HELIUS_API_KEY</code> /{" "}
            <code className="text-cyan">SOLANA_RPC_URL</code> / Jupiter in env — not in your
            Settings vault.
          </p>
        </section>

        {/* 5 MoonPay */}
        <section className="glass max-w-xl space-y-4 rounded-2xl p-6">
          <h2 className="font-display text-xl font-bold">5. MoonPay / discovery</h2>
          <p className="text-xs text-mist">
            Optional contact email for discovery / MoonPay Agents tooling. Not a secret vault key
            — public tools on <Link href="/tools" className="text-cyan underline">/tools</Link>{" "}
            work without it.
          </p>
          <label className="block text-xs text-mist">
            MoonPay email
            <input
              className="input-forge mt-1"
              type="email"
              value={moonpayEmail}
              onChange={(e) => setMoonpayEmail(e.target.value)}
              placeholder="you@example.com"
            />
          </label>
        </section>

        <button className="btn-cyan w-full max-w-xl rounded-xl py-3 text-sm">
          Save encrypted vault + profile
        </button>
      </form>

      {/* 6 X verify */}
      <section className="glass mt-8 max-w-xl space-y-3 rounded-2xl p-6">
        <h2 className="font-display text-xl font-bold">6. X verify</h2>
        <p className="text-xs text-mist">
          Tweet a WindAgents <code className="text-cyan">WIND-</code> code with your profile link.
          Localhost accepts a valid x.com status URL after start.
        </p>
        {verifyStatus && (
          <div className="font-mono text-[11px] text-mist">
            verified: {String(verifyStatus.verified)} · handle:{" "}
            {String(verifyStatus.twitterHandle || "—")}
          </div>
        )}
        <button type="button" onClick={startVerify} className="btn-ghost rounded-xl px-4 py-2 text-xs">
          Start (get WIND- code)
        </button>
        {verifyCode && (
          <p className="font-mono text-sm text-cyan">
            {verifyCode}
            <br />
            <span className="text-[11px] text-mist">{verifyInstructions}</span>
          </p>
        )}
        <form onSubmit={confirmVerify} className="space-y-2">
          <input
            className="input-forge font-mono text-xs"
            placeholder="https://x.com/you/status/…"
            value={tweetUrl}
            onChange={(e) => setTweetUrl(e.target.value)}
          />
          <button className="btn-cyan w-full rounded-xl py-2 text-sm">Verify tweet URL</button>
        </form>
      </section>

      {/* 7 Uploads */}
      <section className="glass mt-8 max-w-xl space-y-3 rounded-2xl p-6">
        <h2 className="font-display text-xl font-bold">7. Uploads</h2>
        <p className="text-xs text-mist">Uses POST /api/upload (max ~2MB). Returns /api/upload/:id URL.</p>
        <label className="block text-xs text-mist">
          Avatar image
          <input
            type="file"
            accept="image/*"
            className="mt-1 block w-full text-xs"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) onUpload(f, "image");
            }}
          />
        </label>
        <label className="block text-xs text-mist">
          Banner
          <input
            type="file"
            accept="image/*"
            className="mt-1 block w-full text-xs"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) onUpload(f, "banner");
            }}
          />
        </label>
        {uploadMsg && <p className="font-mono text-[11px] text-cyan">{uploadMsg}</p>}
      </section>

      {/* 8 Integrations map */}
      <section className="mt-8 max-w-3xl">
        <h2 className="font-display text-xl font-bold">8. Integrations map</h2>
        <p className="mt-1 text-xs text-mist">
          Cards linking Tokenize, Skills, Tools, Terminal, PayBox, x402, Community — with notes
          when your <code className="text-cyan">cpk_</code> / <code className="text-cyan">pbx_</code>{" "}
          is required.
        </p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {INTEGRATIONS.map((c) => (
            <Link
              key={c.href}
              href={c.href}
              className="glass block rounded-2xl p-4 transition hover:border-cyan/40"
            >
              <p className="font-display font-bold text-frost">{c.title}</p>
              <p className="mt-1 text-[11px] text-mist">{c.note}</p>
            </Link>
          ))}
        </div>
      </section>

      <button
        type="button"
        className="mt-8 text-xs text-ember hover:underline"
        onClick={() => {
          clearAuth();
          router.push("/");
        }}
      >
        Sign out (clear local token)
      </button>
    </div>
  );
}
