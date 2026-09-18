/**
 * ClawPump REST + MCP client patterns (from AnsemRail skill.md study).
 * - REST API (api.clawpump.tech / clawpump.tech/api/v1): accepts Bearer cpk_ keys
 * - MCP (mcp.clawpump.tech): OAuth-only — rejects cpk_ with invalid_token
 * Never fakes responses — connect-key errors when cpk_ missing.
 */
import { decryptApiKey } from "./crypto";

const CLAWPUMP_API = process.env.CLAWPUMP_API_URL || "https://clawpump.tech/api/v1";
const CLAWPUMP_MCP = process.env.CLAWPUMP_MCP_URL || "https://mcp.clawpump.tech";
const CLAWPUMP_REST_MCP = process.env.CLAWPUMP_REST_MCP_URL || "https://api.clawpump.tech/mcp";

export function extractClawpumpKey(encryptedKeysJson: string | null | undefined): string | null {
  if (!encryptedKeysJson) return null;
  try {
    const parsed = JSON.parse(encryptedKeysJson);
    if (parsed.clawpumpApiKey) {
      const key = decryptApiKey(parsed.clawpumpApiKey);
      if (typeof key === "string" && key.startsWith("cpk_")) return key;
    }
  } catch {}
  return null;
}

export async function clawpumpFetch(
  path: string,
  apiKey: string,
  init: RequestInit = {}
): Promise<Response> {
  const headers = new Headers(init.headers);
  headers.set("Authorization", `Bearer ${apiKey}`);
  headers.set("Content-Type", "application/json");
  headers.set("Accept", "application/json");
  const p = path.startsWith("/") ? path : `/${path}`;
  return fetch(`${CLAWPUMP_API}${p}`, { ...init, headers });
}

/**
 * Prefer REST-compatible MCP endpoint when using cpk_ keys.
 * Official mcp.clawpump.tech is OAuth-only and rejects cpk_.
 */
export async function clawpumpMcpCall(
  apiKey: string,
  method: string,
  params: Record<string, unknown> = {},
  id = 1
): Promise<unknown> {
  const url = apiKey.startsWith("cpk_") ? CLAWPUMP_REST_MCP : CLAWPUMP_MCP;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      Accept: "application/json, text/event-stream",
    },
    body: JSON.stringify({ jsonrpc: "2.0", id, method, params }),
  });
  const text = await res.text();
  try {
    return JSON.parse(text);
  } catch {
    return { raw: text, status: res.status };
  }
}

export function clawpumpInfo() {
  return {
    name: "ClawPump",
    apiBase: CLAWPUMP_API,
    mcpOAuthUrl: CLAWPUMP_MCP,
    mcpCpkUrl: CLAWPUMP_REST_MCP,
    auth: {
      rest: "Bearer cpk_... from clawpump.tech/dashboard/api",
      mcpOfficial: "OAuth only — mcp.clawpump.tech rejects cpk_ (invalid_token)",
      mcpWithCpk: "Use REST API or api.clawpump.tech/mcp for cpk_ keys",
    },
    note: "WindAgents proxies ClawPump when a cpk_ key is saved in Settings. No mock agents or balances.",
    endpoints: {
      listAgents: "GET /agents",
      createAgent: "POST /agents",
      chat: "POST /agents/:id/chat",
      start: "POST /agents/:id/start",
      stop: "POST /agents/:id/stop",
      mcp: "POST JSON-RPC (cpk_ → REST MCP; OAuth → mcp.clawpump.tech)",
    },
  };
}
