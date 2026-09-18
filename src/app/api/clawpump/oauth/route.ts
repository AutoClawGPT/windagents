export async function GET() {
  const clientId = process.env.CLAWPUMP_OAUTH_CLIENT_ID || "";
  const base =
    (process.env.CLAWPUMP_OAUTH_REDIRECT_URI ||
      process.env.NEXT_PUBLIC_APP_URL ||
      "http://localhost:3000").replace(/\/$/, "");
  const redirectUri = process.env.CLAWPUMP_OAUTH_REDIRECT_URI
    ? process.env.CLAWPUMP_OAUTH_REDIRECT_URI
    : `${base}/api/clawpump/oauth/callback`;
  const authBase =
    process.env.CLAWPUMP_OAUTH_AUTHORIZE_URL || "https://clawpump.tech/oauth/authorize";

  if (!clientId) {
    return Response.json({
      authorizeUrl: null,
      pkce: true,
      message:
        "Official mcp.clawpump.tech is OAuth-only; WindAgents uses cpk_ via REST. Set CLAWPUMP_OAUTH_CLIENT_ID to enable.",
      hint: "Save a cpk_ key in Settings for REST agent/chat. OAuth is optional for official MCP host.",
    });
  }

  const state = crypto.randomUUID();
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    state,
    code_challenge_method: "S256",
  });
  const authorizeUrl = `${authBase}?${params.toString()}`;

  return Response.json({
    authorizeUrl,
    pkce: true,
    state,
    message:
      "OAuth authorize URL built from CLAWPUMP_OAUTH_CLIENT_ID. Complete via /api/clawpump/oauth/callback.",
  });
}
