/**
 * ClawPump REST + MCP client patterns (from AnsemRail skill.md study).
 * - REST API (clawpump.tech/api/v1): accepts Bearer cpk_ keys
 * - Official MCP (mcp.clawpump.tech): OAuth-only — rejects cpk_ with invalid_token
 * - api.clawpump.tech is DNS-dead; cpk_ MCP is bridged via Partner REST (no fake data)
 * Never fakes responses — connect-key errors when cpk_ missing.
 */
import { decryptApiKey } from "./crypto";

const CLAWPUMP_API = process.env.CLAWPUMP_API_URL || "https://clawpump.tech/api/v1";
const CLAWPUMP_MCP = process.env.CLAWPUMP_MCP_URL || "https://mcp.clawpump.tech";
/** Optional override. Dead default host api.clawpump.tech is ignored — use REST bridge for cpk_. */
const CLAWPUMP_REST_MCP_ENV = (process.env.CLAWPUMP_REST_MCP_URL || "").trim();

function isDeadRestMcpHost(url: string): boolean {
  try {
    const host = new URL(url).hostname.toLowerCase();
    return host === "api.clawpump.tech" || host.endsWith(".api.clawpump.tech");
  } catch {
    return true;
  }
}

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

const CPK_REST_TOOLS = [
  {
    name: "agents_list",
    description: "List ClawPump agents for this cpk_ (GET /agents)",
    inputSchema: { type: "object", properties: {} },
  },
  {
    name: "agents_create",
    description: "Create a ClawPump agent (POST /agents)",
    inputSchema: {
      type: "object",
      properties: {
        name: { type: "string" },
        persona: { type: "string" },
        model: { type: "string" },
        skills: { type: "array", items: { type: "string" } },
      },
      required: ["name"],
    },
  },
  {
    name: "agents_get",
    description: "Get one ClawPump agent (GET /agents/:id)",
    inputSchema: {
      type: "object",
      properties: { agentId: { type: "string" } },
      required: ["agentId"],
    },
  },
  {
    name: "agents_chat",
    description: "Chat with a ClawPump agent (POST /agents/:id/chat)",
    inputSchema: {
      type: "object",
      properties: {
        agentId: { type: "string" },
        message: { type: "string" },
      },
      required: ["agentId", "message"],
    },
  },
  {
    name: "agents_start",
    description: "Start a ClawPump agent (POST /agents/:id/start)",
    inputSchema: {
      type: "object",
      properties: { agentId: { type: "string" } },
      required: ["agentId"],
    },
  },
  {
    name: "agents_stop",
    description: "Stop a ClawPump agent (POST /agents/:id/stop)",
    inputSchema: {
      type: "object",
      properties: { agentId: { type: "string" } },
      required: ["agentId"],
    },
  },
] as const;

async function restJson(
  apiKey: string,
  path: string,
  init: RequestInit = {}
): Promise<{ ok: boolean; status: number; body: unknown }> {
  const res = await clawpumpFetch(path, apiKey, init);
  const text = await res.text();
  let body: unknown = text;
  try {
    body = JSON.parse(text);
  } catch {
    /* keep raw text */
  }
  return { ok: res.ok, status: res.status, body };
}

function rpcResult(id: number, result: unknown) {
  return { jsonrpc: "2.0", id, result };
}

function rpcError(id: number, code: number, message: string, data?: unknown) {
  return { jsonrpc: "2.0", id, error: { code, message, data } };
}

async function clawpumpCpkRestBridge(
  apiKey: string,
  method: string,
  params: Record<string, unknown>,
  id: number
): Promise<unknown> {
  if (method === "initialize" || method === "notifications/initialized") {
    return rpcResult(id, {
      protocolVersion: "2024-11-05",
      capabilities: { tools: {} },
      serverInfo: {
        name: "windagents-clawpump-rest-bridge",
        version: "1.0.0",
        description:
          "cpk_ has no live MCP host (api.clawpump.tech DNS dead; mcp.clawpump.tech is OAuth-only). WindAgents bridges tools via Partner REST.",
      },
    });
  }

  if (method === "tools/list") {
    return rpcResult(id, { tools: CPK_REST_TOOLS });
  }

  if (method === "tools/call") {
    const name = String(params.name || "");
    const args = (params.arguments || params.args || {}) as Record<string, unknown>;
    const agentId = String(args.agentId || args.id || "");

    let upstream: { ok: boolean; status: number; body: unknown };

    switch (name) {
      case "agents_list":
        upstream = await restJson(apiKey, "/agents");
        break;
      case "agents_create":
        upstream = await restJson(apiKey, "/agents", {
          method: "POST",
          body: JSON.stringify(args),
        });
        break;
      case "agents_get":
        if (!agentId) return rpcError(id, -32602, "agentId required");
        upstream = await restJson(apiKey, `/agents/${encodeURIComponent(agentId)}`);
        break;
      case "agents_chat": {
        if (!agentId) return rpcError(id, -32602, "agentId required");
        const message = String(args.message || args.content || "");
        if (!message) return rpcError(id, -32602, "message required");
        upstream = await restJson(apiKey, `/agents/${encodeURIComponent(agentId)}/chat`, {
          method: "POST",
          body: JSON.stringify({ message, ...args, agentId: undefined }),
        });
        break;
      }
      case "agents_start":
        if (!agentId) return rpcError(id, -32602, "agentId required");
        upstream = await restJson(apiKey, `/agents/${encodeURIComponent(agentId)}/start`, {
          method: "POST",
          body: "{}",
        });
        break;
      case "agents_stop":
        if (!agentId) return rpcError(id, -32602, "agentId required");
        upstream = await restJson(apiKey, `/agents/${encodeURIComponent(agentId)}/stop`, {
          method: "POST",
          body: "{}",
        });
        break;
      default:
        return rpcError(id, -32601, `Unknown tool: ${name}`, {
          hint: "Use tools/list. cpk_ bridge maps Partner REST only — no invented mints/balances.",
        });
    }

    const text = typeof upstream.body === "string" ? upstream.body : JSON.stringify(upstream.body);
    return rpcResult(id, {
      content: [{ type: "text", text }],
      isError: !upstream.ok,
      _meta: { httpStatus: upstream.status, bridge: "clawpump-rest", apiBase: CLAWPUMP_API },
    });
  }

  return rpcError(id, -32601, `Method not supported on cpk_ REST bridge: ${method}`, {
    supported: ["initialize", "tools/list", "tools/call"],
  });
}

/**
 * Prefer WindAgents REST→MCP bridge for cpk_ (api.clawpump.tech is DNS NXDOMAIN).
 * Optional CLAWPUMP_REST_MCP_URL is tried only when it is not the dead host; on failure we fall back to the bridge.
 * OAuth tokens still hit mcp.clawpump.tech.
 */
export async function clawpumpMcpCall(
  apiKey: string,
  method: string,
  params: Record<string, unknown> = {},
  id = 1
): Promise<unknown> {
  if (apiKey.startsWith("cpk_")) {
    const override =
      CLAWPUMP_REST_MCP_ENV && !isDeadRestMcpHost(CLAWPUMP_REST_MCP_ENV)
        ? CLAWPUMP_REST_MCP_ENV
        : "";
    if (override) {
      try {
        const res = await fetch(override, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json",
            Accept: "application/json, text/event-stream",
          },
          body: JSON.stringify({ jsonrpc: "2.0", id, method, params }),
        });
        if (res.ok) {
          const text = await res.text();
          try {
            return JSON.parse(text);
          } catch {
            return { raw: text, status: res.status };
          }
        }
      } catch {
        /* fall through to REST bridge */
      }
    }
    return clawpumpCpkRestBridge(apiKey, method, params, id);
  }

  const res = await fetch(CLAWPUMP_MCP, {
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
    mcpCpkMode: "windagents-rest-bridge",
    mcpCpkOverride: CLAWPUMP_REST_MCP_ENV && !isDeadRestMcpHost(CLAWPUMP_REST_MCP_ENV)
      ? CLAWPUMP_REST_MCP_ENV
      : null,
    auth: {
      rest: "Bearer cpk_... from clawpump.tech/dashboard/api",
      mcpOfficial: "OAuth only — mcp.clawpump.tech rejects cpk_ (invalid_token)",
      mcpWithCpk:
        "cpk_ uses WindAgents REST→MCP bridge (Partner /api/v1). api.clawpump.tech is DNS-dead and is not used.",
    },
    note: "WindAgents proxies ClawPump when a cpk_ key is saved in Settings. No mock agents or balances.",
    endpoints: {
      listAgents: "GET /agents",
      createAgent: "POST /agents",
      chat: "POST /agents/:id/chat",
      start: "POST /agents/:id/start",
      stop: "POST /agents/:id/stop",
      mcp: "POST JSON-RPC (cpk_ → REST bridge; OAuth → mcp.clawpump.tech)",
    },
  };
}
