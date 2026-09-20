/**
 * Durable WindAgents registry — Redis Cloud (REDIS_URL / ioredis) primary,
 * Upstash REST optional fallback.
 * Stores WindAgents user/agent rows for skill.md join + public profiles.
 * Plaintext cpk_/pbx_ never stored. AES-GCM ciphertext vault blobs live at wa:vault:{userId}
 * so Settings keys survive Vercel /tmp SQLite heals (still encrypted; ENCRYPTION_KEY required).
 *
 * Key schema: wa:user:, wa:agent:, wa:pubkey:, set wa:agents:public
 */
import { Redis as UpstashRedis } from "@upstash/redis";
import IORedis from "ioredis";

export type RegistryUser = {
  id: string;
  type: "human" | "agent";
  displayName: string | null;
  email?: string | null;
  ed25519PublicKey?: string | null;
  authTokenHash?: string | null;
  skillMdContent?: string | null;
  createdAt: string;
  updatedAt: string;
};

export type RegistryAgent = {
  id: string;
  userId: string;
  name: string;
  persona?: string | null;
  model?: string | null;
  status: string;
  isPublic: boolean;
  clawpumpAgentId?: string | null;
  avatarGlbUrl?: string | null;
  avatarPrompt?: string | null;
  skills?: string | null;
  createdAt: string;
  updatedAt: string;
};

type RegistryBackend = {
  getJson<T>(key: string): Promise<T | null>;
  setJson(key: string, value: unknown): Promise<void>;
  getString(key: string): Promise<string | null>;
  setString(key: string, value: string): Promise<void>;
  sadd(key: string, member: string): Promise<void>;
  srem(key: string, member: string): Promise<void>;
};

let ioRedis: IORedis | null | undefined;
let upstashRedis: UpstashRedis | null | undefined;
let backend: RegistryBackend | null | undefined;

export function isRedisUrlConfigured(): boolean {
  return !!process.env.REDIS_URL?.trim();
}

export function isUpstashConfigured(): boolean {
  return !!(
    process.env.UPSTASH_REDIS_REST_URL?.trim() &&
    process.env.UPSTASH_REDIS_REST_TOKEN?.trim()
  );
}

/** True when Redis Cloud (REDIS_URL) or Upstash REST pair is set. */
export function isRegistryConfigured(): boolean {
  return isRedisUrlConfigured() || isUpstashConfigured();
}

function getIORedis(): IORedis | null {
  if (ioRedis !== undefined) return ioRedis;
  const url = process.env.REDIS_URL?.trim();
  if (!url) {
    ioRedis = null;
    return null;
  }
  ioRedis = new IORedis(url, {
    maxRetriesPerRequest: 1,
    enableOfflineQueue: false,
    lazyConnect: true,
  });
  return ioRedis;
}

function getUpstashRedis(): UpstashRedis | null {
  if (upstashRedis !== undefined) return upstashRedis;
  if (!isUpstashConfigured()) {
    upstashRedis = null;
    return null;
  }
  upstashRedis = new UpstashRedis({
    url: process.env.UPSTASH_REDIS_REST_URL!.trim(),
    token: process.env.UPSTASH_REDIS_REST_TOKEN!.trim(),
  });
  return upstashRedis;
}

async function ensureIORedisConnected(r: IORedis): Promise<void> {
  // lazyConnect starts in "wait"; offline queue is off so we must connect first.
  if (r.status === "wait" || r.status === "end" || r.status === "close") {
    await r.connect();
  }
}

function makeIORedisBackend(r: IORedis): RegistryBackend {
  return {
    async getJson<T>(key: string): Promise<T | null> {
      await ensureIORedisConnected(r);
      const raw = await r.get(key);
      if (raw == null) return null;
      try {
        return JSON.parse(raw) as T;
      } catch {
        return raw as unknown as T;
      }
    },
    async setJson(key: string, value: unknown): Promise<void> {
      await ensureIORedisConnected(r);
      await r.set(key, JSON.stringify(value));
    },
    async getString(key: string): Promise<string | null> {
      await ensureIORedisConnected(r);
      return (await r.get(key)) ?? null;
    },
    async setString(key: string, value: string): Promise<void> {
      await ensureIORedisConnected(r);
      await r.set(key, value);
    },
    async sadd(key: string, member: string): Promise<void> {
      await ensureIORedisConnected(r);
      await r.sadd(key, member);
    },
    async srem(key: string, member: string): Promise<void> {
      await ensureIORedisConnected(r);
      await r.srem(key, member);
    },
  };
}

function makeUpstashBackend(r: UpstashRedis): RegistryBackend {
  return {
    async getJson<T>(key: string): Promise<T | null> {
      const row = await r.get<T>(key);
      return row ?? null;
    },
    async setJson(key: string, value: unknown): Promise<void> {
      await r.set(key, value);
    },
    async getString(key: string): Promise<string | null> {
      const id = await r.get<string>(key);
      return id ?? null;
    },
    async setString(key: string, value: string): Promise<void> {
      await r.set(key, value);
    },
    async sadd(key: string, member: string): Promise<void> {
      await r.sadd(key, member);
    },
    async srem(key: string, member: string): Promise<void> {
      await r.srem(key, member);
    },
  };
}

/** Prefer Redis Cloud when REDIS_URL is set; else Upstash. Lazy singleton. */
function getRegistryBackend(): RegistryBackend | null {
  if (backend !== undefined) return backend;
  const ior = getIORedis();
  if (ior) {
    backend = makeIORedisBackend(ior);
    return backend;
  }
  const up = getUpstashRedis();
  if (up) {
    backend = makeUpstashBackend(up);
    return backend;
  }
  backend = null;
  return null;
}

const userKey = (id: string) => `wa:user:${id}`;
const agentKey = (id: string) => `wa:agent:${id}`;
const pubkeyKey = (pk: string) => `wa:pubkey:${pk}`;
const PUBLIC_AGENTS = "wa:agents:public";

export async function registryPutUser(user: RegistryUser): Promise<void> {
  const r = getRegistryBackend();
  if (!r) return;
  await r.setJson(userKey(user.id), user);
  if (user.ed25519PublicKey) {
    await r.setString(pubkeyKey(user.ed25519PublicKey), user.id);
  }
}

export async function registryGetUser(id: string): Promise<RegistryUser | null> {
  const r = getRegistryBackend();
  if (!r) return null;
  return r.getJson<RegistryUser>(userKey(id));
}

export async function registryGetUserIdByPubkey(pk: string): Promise<string | null> {
  const r = getRegistryBackend();
  if (!r) return null;
  return r.getString(pubkeyKey(pk));
}

export async function registryPutAgent(agent: RegistryAgent): Promise<void> {
  const r = getRegistryBackend();
  if (!r) return;
  await r.setJson(agentKey(agent.id), agent);
  if (agent.isPublic) {
    await r.sadd(PUBLIC_AGENTS, agent.id);
  } else {
    await r.srem(PUBLIC_AGENTS, agent.id);
  }
}

export async function registryGetAgent(id: string): Promise<RegistryAgent | null> {
  const r = getRegistryBackend();
  if (!r) return null;
  return r.getJson<RegistryAgent>(agentKey(id));
}

export async function registryEnsurePublicAgent(opts: {
  userId: string;
  name: string;
  persona?: string | null;
}): Promise<RegistryAgent> {
  const now = new Date().toISOString();
  const existing = await registryGetAgent(opts.userId);
  if (existing) {
    if (existing.name !== opts.name && opts.name) {
      const updated = { ...existing, name: opts.name, updatedAt: now };
      await registryPutAgent(updated);
      return updated;
    }
    return existing;
  }
  const agent: RegistryAgent = {
    id: opts.userId,
    userId: opts.userId,
    name: opts.name || "Agent",
    persona: opts.persona ?? null,
    model: "moonshotai/kimi-k2.5",
    status: "stopped",
    isPublic: true,
    createdAt: now,
    updatedAt: now,
  };
  await registryPutAgent(agent);
  return agent;
}

const vaultKey = (userId: string) => `wa:vault:${userId}`;

/** Persist Settings encryptedKeys JSON (already AES-GCM). Not plaintext API keys. */
export async function registryPutVault(userId: string, encryptedKeysJson: string | null): Promise<void> {
  const r = getRegistryBackend();
  if (!r) return;
  if (!encryptedKeysJson) {
    await r.setString(vaultKey(userId), "");
    return;
  }
  await r.setString(vaultKey(userId), encryptedKeysJson);
}

/** Restore Settings vault ciphertext after ephemeral SQLite heal. */
export async function registryGetVault(userId: string): Promise<string | null> {
  const r = getRegistryBackend();
  if (!r) return null;
  const v = await r.getString(vaultKey(userId));
  if (v == null || v === "") return null;
  return v;
}
