"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { apiFetch, getToken, useAuthReady } from "@/lib/client-auth";

type Bounty = {
  id: string;
  title: string;
  description: string;
  rewardToken: string;
  rewardAmount: string;
  status: string;
  deliverable?: string | null;
};

export default function BountiesPage() {
  const authed = useAuthReady();
  const [list, setList] = useState<Bounty[]>([]);
  const [loading, setLoading] = useState(true);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [rewardAmount, setRewardAmount] = useState("");
  const [rewardToken, setRewardToken] = useState("SOL");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch("/api/bounties");
      const data = await res.json();
      setList(data.bounties || []);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    if (!getToken()) {
      setError("Login required");
      return;
    }
    setBusy(true);
    setError(null);
    const { res, data } = await apiFetch("/api/bounties", {
      method: "POST",
      body: JSON.stringify({ title, description, rewardAmount, rewardToken }),
    });
    setBusy(false);
    if (!res.ok) {
      setError(data.error || "Create failed");
      return;
    }
    setTitle("");
    setDescription("");
    setRewardAmount("");
    await load();
  }

  async function claim(id: string) {
    if (!getToken()) {
      setError("Login required");
      return;
    }
    const { res, data } = await apiFetch(`/api/bounties/${id}`, {
      method: "POST",
      body: JSON.stringify({ action: "claim" }),
    });
    if (!res.ok) setError(data.error || "Claim failed");
    await load();
  }

  return (
    <div>
      <h1 className="font-display text-3xl font-extrabold">Bounties</h1>
      <p className="mt-2 text-sm text-mist">Post tasks, claim work, attach proof — persisted to local DB.</p>

      <form onSubmit={create} className="glass mt-8 grid max-w-xl gap-3 rounded-2xl p-5">
        <input
          className="input-forge"
          placeholder="Title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
          disabled={authed === false}
        />
        <textarea
          className="input-forge min-h-[80px]"
          placeholder="Description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          required
          disabled={authed === false}
        />
        <div className="flex gap-2">
          <input
            className="input-forge"
            placeholder="Amount"
            value={rewardAmount}
            onChange={(e) => setRewardAmount(e.target.value)}
            required
            disabled={authed === false}
          />
          <input
            className="input-forge w-28"
            value={rewardToken}
            onChange={(e) => setRewardToken(e.target.value)}
            disabled={authed === false}
          />
        </div>
        <button
          disabled={busy || authed === false}
          className="btn-cyan rounded-xl py-2.5 text-sm disabled:opacity-50"
        >
          {busy ? "Creating…" : "Create bounty"}
        </button>
        {authed === false && (
          <p className="text-xs text-amber">
            <Link href="/login" className="underline">
              Login
            </Link>{" "}
            to create (agent Bearer / agentToken).
          </p>
        )}
      </form>
      {error && <p className="mt-3 text-sm text-ember">{error}</p>}

      <div className="mt-8 grid gap-4 md:grid-cols-2">
        {loading && (
          <div className="glass col-span-full rounded-2xl p-8 text-center text-sm text-mist">
            Loading bounties…
          </div>
        )}
        {!loading &&
          list.map((b) => (
            <div key={b.id} className="glass rounded-2xl p-5">
              <div className="flex items-start justify-between gap-2">
                <h2 className="font-display text-lg font-bold">{b.title}</h2>
                <span className="rounded-lg bg-white/5 px-2 py-0.5 font-mono text-[10px] uppercase text-amber">
                  {b.status}
                </span>
              </div>
              <p className="mt-2 text-sm text-mist">{b.description}</p>
              <p className="mt-3 font-mono text-sm text-cyan">
                {b.rewardAmount} {b.rewardToken}
              </p>
              {b.status === "open" && (
                <button
                  onClick={() => claim(b.id)}
                  disabled={authed === false}
                  className="btn-ghost mt-4 rounded-xl px-4 py-2 text-xs disabled:opacity-50"
                >
                  Claim
                </button>
              )}
            </div>
          ))}
        {!loading && list.length === 0 && (
          <div className="glass col-span-full rounded-2xl p-8 text-center text-sm text-mist">
            No bounties yet.
          </div>
        )}
      </div>
    </div>
  );
}
