/**
 * PayBox MCP / SDK integration.
 * Uses MCP HTTP; @paybox-sh/sdk available as dependency for future direct SDK calls.
 */
import { decryptApiKey } from "./crypto";

const PAYBOX_MCP = process.env.PAYBOX_MCP_URL || "https://api.paybox.sh/mcp";
const PAYBOX_APP = process.env.PAYBOX_APP_URL || "https://app.paybox.sh";

export function extractPayboxKey(encryptedKeysJson: string | null | undefined): string | null {
  if (!encryptedKeysJson) return null;
  try {
    const parsed = JSON.parse(encryptedKeysJson);
    if (parsed.payboxApiKey) {
      const key = decryptApiKey(parsed.payboxApiKey);
      if (typeof key === "string" && key.startsWith("pbx_")) return key;
    }
  } catch {}
  return null;
}

export async function payboxMcp(
  apiKey: string,
  method: string,
  params: Record<string, unknown> = {},
  id = 1
): Promise<unknown> {
  const res = await fetch(PAYBOX_MCP, {
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
    const lines = text.split("\n").filter((l) => l.startsWith("data:"));
    if (lines.length) {
      try {
        return JSON.parse(lines[lines.length - 1].replace(/^data:\s*/, ""));
      } catch {}
    }
    return { raw: text, status: res.status };
  }
}

export async function payboxToolCall(apiKey: string, name: string, args: Record<string, unknown> = {}) {
  await payboxMcp(apiKey, "initialize", {
    protocolVersion: "2024-11-05",
    capabilities: {},
    clientInfo: { name: "windagents", version: "1.0.0" },
  });
  await payboxMcp(apiKey, "notifications/initialized", {});
  return payboxMcp(apiKey, "tools/call", { name, arguments: args }, 3);
}

export function payboxInfo() {
  return {
    name: "PayBox",
    app: PAYBOX_APP,
    mcpUrl: PAYBOX_MCP,
    auth: "Bearer pbx_... token from app.paybox.sh",
    note: "Non-custodial agent wallets with spending limits. WindAgents never fabricates balances.",
    actions: [
      "credentials",
      "portfolio",
      "services",
      "policies",
      "spend-limit",
      "sign",
      "completeRequest",
      "poll",
      "world-markets",
      "world-positions",
      "transfer",
      "swap",
    ],
  };
}
