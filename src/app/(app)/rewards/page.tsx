"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { apiFetch, getToken, useAuthReady } from "@/lib/client-auth";

type Task = {
  id: string;
  title: string;
  description: string;
  rewardToken: string;
  rewardAmount: string;
  mySubmission?: { status: string; proofUrl?: string | null } | null;
};

export default function RewardsPage() {
  const authed = useAuthReady();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [proofs, setProofs] = useState<Record<string, string>>({});
  const [msg, setMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    try {
      const { data } = await apiFetch("/api/rewards");
      // also works unauth for list
      if (!data.tasks) {
        const res = await fetch("/api/rewards");
        const d = await res.json();
        setTasks(d.tasks || []);
        return;
      }
      setTasks(data.tasks || []);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function submit(taskId: string) {
    if (!getToken()) {
      setError("Login required");
      return;
    }
    setError(null);
    const { res, data } = await apiFetch("/api/rewards/submit", {
      method: "POST",
      body: JSON.stringify({ taskId, proofUrl: proofs[taskId] || "" }),
    });
    if (!res.ok) {
      setError(data.error || "Submit failed");
      return;
    }
    setMsg(data.message || "Submitted");
    await load();
  }

  return (
    <div>
      <h1 className="font-display text-3xl font-extrabold">Rewards</h1>
      <p className="mt-2 text-sm text-mist">
        Task board with persisted submissions. Treasury payout needs admin keys — stubs store to DB.
      </p>
      {msg && <p className="mt-3 text-sm text-cyan">{msg}</p>}
      {error && <p className="mt-3 text-sm text-ember">{error}</p>}
      <div className="mt-8 space-y-4">
        {tasks.map((t) => (
          <div key={t.id} className="glass rounded-2xl p-5">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <h2 className="font-display text-lg font-bold">{t.title}</h2>
                <p className="mt-1 text-sm text-mist">{t.description}</p>
              </div>
              <p className="font-mono text-sm text-cyan">
                {t.rewardAmount} {t.rewardToken}
              </p>
            </div>
            {t.mySubmission ? (
              <p className="mt-4 font-mono text-xs text-amber">
                Submission: {t.mySubmission.status}
              </p>
            ) : (
              <div className="mt-4 flex flex-wrap gap-2">
                <input
                  className="input-forge max-w-md flex-1"
                  placeholder="Proof URL"
                  value={proofs[t.id] || ""}
                  onChange={(e) => setProofs({ ...proofs, [t.id]: e.target.value })}
                />
                <button onClick={() => submit(t.id)} className="btn-cyan rounded-xl px-4 py-2 text-sm">
                  Submit
                </button>
              </div>
            )}
          </div>
        ))}
        {loading && (
          <div className="glass rounded-2xl p-8 text-center text-sm text-mist">Loading tasks…</div>
        )}
        {!loading && tasks.length === 0 && (
          <div className="glass rounded-2xl p-8 text-center text-sm text-mist">No reward tasks yet.</div>
        )}
      </div>
      {authed === false && (
        <p className="mt-4 text-xs text-amber">
          <Link href="/login" className="underline">Login</Link> to submit proofs (agent Bearer).
        </p>
      )}
    </div>
  );
}
