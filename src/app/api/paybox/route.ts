import { requireUser, isUser } from "@/lib/auth";
import { extractPayboxKey, payboxInfo, payboxMcp, payboxToolCall } from "@/lib/paybox";
import { connectKeyError } from "@/lib/utils";

const LIVE_ACTIONS = new Set([
  "credentials",
  "tools",
  "services",
  "portfolio",
  "world-markets",
  "world-positions",
  "policies",
  "spend-limit",
  "sign",
  "completeRequest",
  "poll",
  "transfer",
  "swap",
]);

export async function GET(req: Request) {
  const user = await requireUser(req);
  if (!isUser(user)) return user;

  const url = new URL(req.url);
  const action = url.searchParams.get("action") || "info";
  const pbx = extractPayboxKey(user.encryptedKeys);

  if (action === "info") {
    return Response.json({
      ...payboxInfo(),
      connected: !!pbx,
      windActions: [
        "credentials",
        "portfolio",
        "services",
        "tools",
        "policies",
        "spend-limit",
        "sign",
        "completeRequest",
        "poll",
        "transfer",
        "swap",
        "world-markets",
        "world-positions",
      ],
      message: pbx
        ? "PayBox key present (masked). Use action=credentials|portfolio|policies|spend-limit|sign|completeRequest|poll|…"
        : "Connect pbx_ in Settings for live PayBox MCP calls.",
    });
  }

  if (!pbx) {
    return connectKeyError("PayBox", "PUT /api/settings { payboxApiKey: 'pbx_...' }");
  }

  try {
    if (action === "tools") {
      await payboxMcp(pbx, "initialize", {
        protocolVersion: "2024-11-05",
        capabilities: {},
        clientInfo: { name: "windagents", version: "1.0.0" },
      });
      const tools = await payboxMcp(pbx, "tools/list", {}, 2);
      return Response.json({ action, result: tools });
    }
    if (action === "credentials") {
      const result = await payboxToolCall(pbx, "list_credentials", {});
      return Response.json({ action, result });
    }
    if (action === "portfolio") {
      const credentialId = url.searchParams.get("credentialId") || "";
      const result = await payboxToolCall(pbx, "get_portfolio", { credentialId });
      return Response.json({ action, result });
    }
    if (action === "services") {
      const result = await payboxToolCall(pbx, "list_services", {});
      return Response.json({ action, result });
    }
    if (action === "policies" || action === "spend-limit") {
      // WindAgents-named — map to PayBox list/get policy tools when available
      const credentialId = url.searchParams.get("credentialId") || "";
      const tool =
        action === "policies" ? "list_policies" : "get_spend_limit";
      const result = await payboxToolCall(pbx, tool, { credentialId });
      return Response.json({ action, tool, result });
    }
    if (action === "poll" || action === "completeRequest") {
      const requestId = url.searchParams.get("requestId") || url.searchParams.get("id") || "";
      if (!requestId) {
        return Response.json({ error: "requestId required" }, { status: 400 });
      }
      const tool = action === "poll" ? "get_request" : "complete_request";
      const result = await payboxToolCall(pbx, tool, { requestId });
      return Response.json({ action, tool, result });
    }
    if (action === "world-markets") {
      const result = await payboxToolCall(pbx, "world_markets", {});
      return Response.json({ action, result });
    }
    if (action === "world-positions") {
      const address = url.searchParams.get("address") || "";
      const result = await payboxToolCall(pbx, "world_positions", { address });
      return Response.json({ action, result });
    }
    if (!LIVE_ACTIONS.has(action)) {
      return Response.json({ error: `Unknown action: ${action}`, info: payboxInfo() }, { status: 400 });
    }
    return Response.json(
      { error: `action ${action} requires POST with arguments`, hint: "Use POST /api/paybox" },
      { status: 400 }
    );
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "PayBox call failed";
    return Response.json({ error: msg }, { status: 502 });
  }
}

export async function POST(req: Request) {
  const user = await requireUser(req);
  if (!isUser(user)) return user;

  const pbx = extractPayboxKey(user.encryptedKeys);
  if (!pbx) {
    return connectKeyError("PayBox", "PUT /api/settings { payboxApiKey: 'pbx_...' }");
  }

  try {
    const body = await req.json();
    const action = String(body.action || "tools/call");
    const tool = body.tool || body.name;
    const args = body.arguments || body.args || {};

    if (action === "mcp") {
      const result = await payboxMcp(pbx, String(body.method || "tools/list"), body.params || {});
      return Response.json({ result });
    }

    // WindAgents-named high-level actions (not competitor brand policy names)
    const named: Record<string, string> = {
      policies: "list_policies",
      "spend-limit": "get_spend_limit",
      setSpendLimit: "set_spend_limit",
      sign: "request_wallet_sign",
      completeRequest: "complete_request",
      poll: "get_request",
      transfer: "request_transfer",
      swap: "request_swap",
    };

    if (named[action]) {
      const result = await payboxToolCall(pbx, named[action], args);
      return Response.json({ action, tool: named[action], result });
    }

    if (!tool) {
      return Response.json({ error: "tool/name required for tools/call" }, { status: 400 });
    }

    const result = await payboxToolCall(pbx, String(tool), args);
    return Response.json({ action: "tools/call", tool, result });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "PayBox POST failed";
    return Response.json({ error: msg }, { status: 502 });
  }
}
