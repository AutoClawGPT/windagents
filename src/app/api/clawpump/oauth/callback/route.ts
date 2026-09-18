export async function GET(req: Request) {
  const clientId = process.env.CLAWPUMP_OAUTH_CLIENT_ID || "";
  const clientSecret = process.env.CLAWPUMP_OAUTH_CLIENT_SECRET || "";
  const tokenUrl =
    process.env.CLAWPUMP_OAUTH_TOKEN_URL || "https://clawpump.tech/oauth/token";
  const redirectUri =
    process.env.CLAWPUMP_OAUTH_REDIRECT_URI ||
    "http://localhost:3000/api/clawpump/oauth/callback";

  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const error = url.searchParams.get("error");

  if (!clientId) {
    return Response.json(
      {
        error: "oauth_not_configured",
        message:
          "CLAWPUMP_OAUTH_CLIENT_ID not set. WindAgents primarily uses cpk_ REST keys — configure OAuth only if you need mcp.clawpump.tech.",
      },
      { status: 501 }
    );
  }

  if (error) {
    return Response.json({ error: "oauth_error", message: error }, { status: 400 });
  }

  if (!code) {
    return Response.json(
      { error: "code_missing", message: "OAuth callback expects ?code=..." },
      { status: 400 }
    );
  }

  if (!clientSecret) {
    return Response.json(
      {
        error: "oauth_secret_missing",
        message: "CLAWPUMP_OAUTH_CLIENT_SECRET required to exchange code. No tokens invented.",
      },
      { status: 501 }
    );
  }

  try {
    const res = await fetch(tokenUrl, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded", Accept: "application/json" },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
      }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      return Response.json(
        { error: "token_exchange_failed", upstreamStatus: res.status, upstream: data },
        { status: 502 }
      );
    }
    return Response.json({
      ok: true,
      message: "Token exchange succeeded — store access_token securely; never log secrets.",
      tokenType: data.token_type || null,
      expiresIn: data.expires_in || null,
      // Do not echo refresh/access tokens in logs; return only presence flags for UI
      hasAccessToken: !!data.access_token,
      hasRefreshToken: !!data.refresh_token,
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "exchange failed";
    return Response.json({ error: "token_exchange_error", message: msg }, { status: 502 });
  }
}
