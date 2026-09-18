/**
 * Durable WindAgents registry on Upstash Redis (platform infra only).
 * Stores WindAgents user/agent rows for skill.md join + public profiles.
 * Never stores ClawPump cpk_ / PayBox pbx_ here — those stay in Settings vault.
 */
import { Redis } from "@upstash/redis";

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

let redis: Redis | null | undefined;

export function isUpstashConfigured(): boolean {
  return !!(
    process.env.UPSTASH_REDIS_REST_URL?.trim() &&
    process.env.UPSTASH_REDIS_REST_TOKEN?.trim()
  );
}

export function getUpstashRedis(): Redis | null {
  if (redis !== undefined) return redis;
  if (!isUpstashConfigured()) {
    redis = null;
    return null;
  }
  redis = new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL!.trim(),
    token: process.env.UPSTASH_REDIS_REST_TOKEN!.trim(),
  });
  return redis;
}

const userKey = (id: string) => `wa:user:${id}`;
const agentKey = (id: string) => `wa:agent:${id}`;
const pubkeyKey = (pk: string) => `wa:pubkey:${pk}`;
const PUBLIC_AGENTS = "wa:agents:public";

export async function registryPutUser(user: RegistryUser): Promise<void> {
  const r = getUpstashRedis();
  if (!r) return;
  await r.set(userKey(user.id), user);
  if (user.ed25519PublicKey) {
    await r.set(pubkeyKey(user.ed25519PublicKey), user.id);
  }
}

export async function registryGetUser(id: string): Promise<RegistryUser | null> {
  const r = getUpstashRedis();
  if (!r) return null;
  const row = await r.get<RegistryUser>(userKey(id));
  return row ?? null;
}

export async function registryGetUserIdByPubkey(pk: string): Promise<string | null> {
  const r = getUpstashRedis();
  if (!r) return null;
  const id = await r.get<string>(pubkeyKey(pk));
  return id ?? null;
}

export async function registryPutAgent(agent: RegistryAgent): Promise<void> {
  const r = getUpstashRedis();
  if (!r) return;
  await r.set(agentKey(agent.id), agent);
  if (agent.isPublic) {
    await r.sadd(PUBLIC_AGENTS, agent.id);
  } else {
    await r.srem(PUBLIC_AGENTS, agent.id);
  }
}

export async function registryGetAgent(id: string): Promise<RegistryAgent | null> {
  const r = getUpstashRedis();
  if (!r) return null;
  const row = await r.get<RegistryAgent>(agentKey(id));
  return row ?? null;
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
