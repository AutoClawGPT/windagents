import { requireUser, isUser } from "@/lib/auth";
import { extractClawpumpKey, clawpumpInfo, clawpumpMcpCall } from "@/lib/clawpump";
import { connectKeyError } from "@/lib/utils";

export async function GET() {
  return Response.json({
    ...clawpumpInfo(),
    proxy: "POST /api/clawpump/mcp with Bearer auth + cpk_ in Settings",
    note: "WindAgents does not invent MCP tool results.",
  });
}

export async function POST(req: Request) {
  const user = await requireUser(req);
  if (!isUser(user)) return user;

  const cpk = extractClawpumpKey(user.encryptedKeys);
  if (!cpk) {
    return connectKeyError("ClawPump", "PUT /api/settings { clawpumpApiKey: 'cpk_...' }");
  }

  try {
    const body = await req.json();
    const method = String(body.method || "tools/list");
    const params = body.params || {};
    const id = body.id ?? 1;
    const result = await clawpumpMcpCall(cpk, method, params, id);
    return Response.json({ method, result });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "MCP proxy failed";
    return Response.json(
      {
        error: msg,
        hint: "cpk_ uses WindAgents Partner REST→MCP bridge. Official mcp.clawpump.tech is OAuth-only; api.clawpump.tech is DNS-dead.",
      },
      { status: 502 }
    );
  }
}
