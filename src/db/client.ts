import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import * as schema from "./schema";
import path from "path";
import fs from "fs";

/**
 * Resolve DB URL without touching the read-only Vercel bundle dir (`/var/task`).
 * Production crash was: ENOENT mkdir '/var/task/data' on every register/* import.
 */
function resolveDatabaseConfig(): { url: string; authToken?: string } {
  const authToken =
    process.env.TURSO_AUTH_TOKEN ||
    process.env.DATABASE_AUTH_TOKEN ||
    process.env.LIBSQL_AUTH_TOKEN ||
    undefined;

  const raw = (process.env.DATABASE_URL || "").trim();
  const onVercel = process.env.VERCEL === "1" || !!process.env.VERCEL_ENV;

  // Remote libsql / turso / http(s) — no local filesystem
  if (raw && !raw.startsWith("file:")) {
    return { url: raw, authToken };
  }

  // File SQLite: localhost uses ./data; Vercel must use /tmp (writable)
  const dir = onVercel ? "/tmp/windagents" : path.join(process.cwd(), "data");
  try {
    fs.mkdirSync(dir, { recursive: true });
  } catch (err) {
    console.error("[db] mkdir failed, using :memory:", err);
    return { url: ":memory:" };
  }
  return { url: `file:${path.join(dir, "windagents.db")}` };
}

const { url, authToken } = resolveDatabaseConfig();
const client = createClient(authToken ? { url, authToken } : { url });

const DDL = `
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL DEFAULT 'human',
  email TEXT,
  wallet_address TEXT,
  auth_token_hash TEXT,
  ed25519_public_key TEXT,
  payout_wallet TEXT,
  encrypted_keys TEXT,
  skill_md_content TEXT,
  display_name TEXT,
  moonpay_email TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS agents (
  id TEXT PRIMARY KEY,
  user_id TEXT REFERENCES users(id),
  clawpump_agent_id TEXT,
  name TEXT NOT NULL,
  persona TEXT,
  model TEXT DEFAULT 'moonshotai/kimi-k2.5',
  status TEXT NOT NULL DEFAULT 'stopped',
  wallet_address TEXT,
  skills TEXT,
  is_public INTEGER NOT NULL DEFAULT 1,
  avatar_url TEXT,
  avatar_glb_url TEXT,
  avatar_prompt TEXT,
  token_mint TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS registrations (
  id TEXT PRIMARY KEY,
  user_id TEXT REFERENCES users(id),
  type TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  ed25519_public_key TEXT,
  ed25519_signature TEXT,
  skill_md_content TEXT,
  payload TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  session_token TEXT NOT NULL UNIQUE,
  expires TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS skills (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  source TEXT NOT NULL DEFAULT 'windagents',
  skill_md_content TEXT,
  tags TEXT,
  installed INTEGER NOT NULL DEFAULT 0,
  user_id TEXT REFERENCES users(id),
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS signals (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL,
  source TEXT NOT NULL,
  token_symbol TEXT,
  token_mint TEXT,
  message TEXT NOT NULL,
  price TEXT,
  confidence INTEGER,
  metadata TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS listings (
  id TEXT PRIMARY KEY,
  agent_id TEXT REFERENCES agents(id),
  title TEXT NOT NULL,
  description TEXT,
  category TEXT,
  price_sol INTEGER,
  status TEXT NOT NULL DEFAULT 'active',
  seller_user_id TEXT REFERENCES users(id),
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS bounties (
  id TEXT PRIMARY KEY,
  creator_user_id TEXT REFERENCES users(id),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  reward_token TEXT NOT NULL DEFAULT 'SOL',
  reward_amount TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open',
  deliverable TEXT,
  proof_url TEXT,
  assignee_user_id TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS agent_reputation (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  trust_tier TEXT NOT NULL DEFAULT 'unrated',
  reputation_score INTEGER NOT NULL DEFAULT 0,
  total_trades INTEGER NOT NULL DEFAULT 0,
  successful_trades INTEGER NOT NULL DEFAULT 0,
  total_launches INTEGER NOT NULL DEFAULT 0,
  total_bounties INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS community_posts (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  content TEXT NOT NULL,
  image_url TEXT,
  tweet_url TEXT,
  like_count INTEGER NOT NULL DEFAULT 0,
  comment_count INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS community_comments (
  id TEXT PRIMARY KEY,
  post_id TEXT NOT NULL REFERENCES community_posts(id),
  user_id TEXT NOT NULL REFERENCES users(id),
  content TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS community_likes (
  id TEXT PRIMARY KEY,
  post_id TEXT NOT NULL REFERENCES community_posts(id),
  user_id TEXT NOT NULL REFERENCES users(id),
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS community_follows (
  id TEXT PRIMARY KEY,
  follower_user_id TEXT NOT NULL REFERENCES users(id),
  following_user_id TEXT NOT NULL REFERENCES users(id),
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS reward_tasks (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  reward_token TEXT NOT NULL DEFAULT 'SOL',
  reward_amount TEXT NOT NULL,
  proof_type TEXT NOT NULL DEFAULT 'url',
  active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS reward_submissions (
  id TEXT PRIMARY KEY,
  task_id TEXT NOT NULL REFERENCES reward_tasks(id),
  user_id TEXT NOT NULL REFERENCES users(id),
  proof_url TEXT,
  proof_wallet TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  notes TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS x402_payments (
  id TEXT PRIMARY KEY,
  user_id TEXT REFERENCES users(id),
  payer_address TEXT,
  amount TEXT NOT NULL,
  token TEXT NOT NULL DEFAULT 'SOL',
  endpoint TEXT,
  tx_signature TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS agent_messages (
  id TEXT PRIMARY KEY,
  agent_id TEXT NOT NULL REFERENCES agents(id),
  role TEXT NOT NULL,
  content TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS uploads (
  id TEXT PRIMARY KEY,
  user_id TEXT REFERENCES users(id),
  kind TEXT NOT NULL DEFAULT 'image',
  mime TEXT NOT NULL,
  path TEXT NOT NULL,
  bytes INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS verifications (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  twitter_handle TEXT,
  twitter_code TEXT,
  twitter_verified_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
`;



async function migrateUserMoonpayEmail() {
  const cols = await client.execute("PRAGMA table_info(users)");
  const names = new Set(
    (cols.rows as unknown as { name: string }[]).map((r) => r.name)
  );
  if (!names.has("moonpay_email")) {
    await client.execute("ALTER TABLE users ADD COLUMN moonpay_email TEXT");
  }
}

async function migrateAgentAvatarColumns() {
  const cols = await client.execute("PRAGMA table_info(agents)");
  const names = new Set(
    (cols.rows as unknown as { name: string }[]).map((r) => r.name)
  );
  if (!names.has("avatar_glb_url")) {
    await client.execute("ALTER TABLE agents ADD COLUMN avatar_glb_url TEXT");
  }
  if (!names.has("avatar_prompt")) {
    await client.execute("ALTER TABLE agents ADD COLUMN avatar_prompt TEXT");
  }
}

async function backfillPublicAgentProfilesSql() {
  // One-shot: agent users missing agents.id=userId get a public identity row
  const res = await client.execute(`
    INSERT INTO agents (id, user_id, name, status, is_public)
    SELECT u.id, u.id, COALESCE(u.display_name, 'Agent'), 'stopped', 1
    FROM users u
    WHERE u.type = 'agent'
      AND NOT EXISTS (SELECT 1 FROM agents a WHERE a.id = u.id)
  `);
  const n = Number((res as { rowsAffected?: number }).rowsAffected || 0);
  if (n > 0) console.log(`[db] backfilled ${n} public agent profile(s)`);
}



const resolvedUrl = url;

/** file:/tmp and :memory: are NOT shared across Vercel isolates — profiles vanish. */
export function getDatabaseMode(): "libsql" | "file" | "memory" {
  if (resolvedUrl === ":memory:" || resolvedUrl.startsWith(":memory:")) return "memory";
  if (resolvedUrl.startsWith("file:")) return "file";
  return "libsql";
}

export function isDurableDatabase(): boolean {
  return getDatabaseMode() === "libsql";
}

/** On Vercel, refuse writes that would only live in /tmp. */
export function assertDurableDatabase(): Response | null {
  const onVercel = process.env.VERCEL === "1" || !!process.env.VERCEL_ENV;
  if (!onVercel) return null;
  if (isDurableDatabase()) return null;
  return Response.json(
    {
      error: "ephemeral_database",
      message:
        "Production DATABASE_URL is still file/tmp SQLite. Agent/human rows will disappear across Vercel instances. Set DATABASE_URL=libsql://… and TURSO_AUTH_TOKEN in Vercel (claw-gpt/windagents), then redeploy. Free Turso DB is enough.",
      mode: getDatabaseMode(),
      need: ["DATABASE_URL (libsql://…)", "TURSO_AUTH_TOKEN"],
    },
    { status: 503 }
  );
}

let bootstrapped = false;
export async function ensureDb() {
  if (bootstrapped) return;
  await client.executeMultiple(DDL);
  await migrateAgentAvatarColumns();
  await migrateUserMoonpayEmail();
  await backfillPublicAgentProfilesSql();
  bootstrapped = true;
}

// Eager bootstrap for server routes
ensureDb().catch((e) => console.error("db bootstrap", e));

export const db = drizzle(client, { schema });
export { client };
export type DB = typeof db;
