import { NextResponse } from "next/server";
import { listDurableLeaderboard } from "@/lib/reputation";
import { registryTombstoneUser } from "@/lib/registry-upstash";
import { db } from "@/db/client";
import { agents, users } from "@/db/schema";
import { eq } from "drizzle-orm";

/** Real / user-facing agents to keep on the public leaderboard. */
const KEEP_NAMES = new Set(
  [
    "zeus ai",
    "pumpai agent",
    "wexai agent",
    "yuri ai agent",
    "secret ai agent",
    "usertryagentb",
    "usertryagentc",
  ].map((s) => s.toLowerCase().replace(/\s+/g, " "))
);

function normName(s: string): string {
  return s.toLowerCase().replace(/\s+/g, " ").trim();
}

/** Smoke-test / probe names from join-flow debugging. */
const TEST_NAME_RE =
  /probe|demo|expose|claim\s*code|global\s*card|e2e|guide|align|plaintext|proof|clawcade|chat\s*reply|card\s*demo|login\s*test/i;

function isAdmin(req: Request): boolean {
  const admin = process.env.ADMIN_TOKEN || "";
  if (!admin) return false;
  const bearer = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "").trim();
  const header = req.headers.get("x-admin-token")?.trim();
  return bearer === admin || header === admin;
}

function shouldPurge(displayName: string | null | undefined): boolean {
  const name = (displayName || "").trim();
  if (!name) return true;
  if (KEEP_NAMES.has(normName(name))) return false;
  return TEST_NAME_RE.test(name);
}

export async function GET(req: Request) {
  if (!isAdmin(req)) {
    return NextResponse.json({ error: "admin_required" }, { status: 401 });
  }
  const board = await listDurableLeaderboard();
  const wouldPurge = board.filter((r) => shouldPurge(r.displayName));
  const keep = board.filter((r) => !shouldPurge(r.displayName));
  return NextResponse.json({
    total: board.length,
    wouldPurge: wouldPurge.map((r) => ({ id: r.userId, name: r.displayName })),
    keep: keep.map((r) => ({ id: r.userId, name: r.displayName })),
  });
}

/** POST — admin-only: tombstone smoke-test agents so leaderboard stays clean for real users. */
export async function POST(req: Request) {
  if (!isAdmin(req)) {
    return NextResponse.json(
      { error: "admin_required", message: "Pass ADMIN_TOKEN as Bearer or x-admin-token" },
      { status: 401 }
    );
  }

  const board = await listDurableLeaderboard();
  const toDelete = board.filter((r) => shouldPurge(r.displayName));
  const deleted: { id: string; name: string }[] = [];
  const errors: { id: string; error: string }[] = [];

  for (const row of toDelete) {
    const id = row.userId;
    try {
      try {
        await db.delete(agents).where(eq(agents.id, id));
      } catch {
        /* ephemeral sqlite ok */
      }
      try {
        await db.delete(users).where(eq(users.id, id));
      } catch {
        /* ignore */
      }
      await registryTombstoneUser(id);
      deleted.push({ id, name: row.displayName || id });
    } catch (e) {
      errors.push({ id, error: e instanceof Error ? e.message : String(e) });
    }
  }

  const kept = (await listDurableLeaderboard()).filter((r) => !shouldPurge(r.displayName));

  return NextResponse.json({
    ok: true,
    purged: deleted.length,
    deleted,
    kept: kept.map((r) => ({ id: r.userId, name: r.displayName })),
    errors,
  });
}
