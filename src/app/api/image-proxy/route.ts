const ALLOWED_HOSTS = new Set([
  "images.unsplash.com",
  "pbs.twimg.com",
  "abs.twimg.com",
  "agents.moonpay.com",
  "localhost",
  "127.0.0.1",
]);

function hostAllowed(hostname: string): boolean {
  const h = hostname.toLowerCase();
  if (ALLOWED_HOSTS.has(h)) return true;
  if (h.endsWith(".clawpump.tech")) return true;
  if (h === "clawpump.tech") return true;
  return false;
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const target = url.searchParams.get("url");
  if (!target) {
    return Response.json({ error: "url query required" }, { status: 400 });
  }
  let parsed: URL;
  try {
    parsed = new URL(target);
  } catch {
    return Response.json({ error: "invalid_url" }, { status: 400 });
  }
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    return Response.json({ error: "protocol_not_allowed" }, { status: 400 });
  }
  if (!hostAllowed(parsed.hostname)) {
    return Response.json(
      {
        error: "host_not_allowed",
        message:
          "Allowlist: images.unsplash.com, pbs.twimg.com, abs.twimg.com, agents.moonpay.com, *.clawpump.tech, localhost",
      },
      { status: 400 }
    );
  }

  try {
    const upstream = await fetch(parsed.toString(), {
      headers: { Accept: "image/*,*/*" },
      signal: AbortSignal.timeout(15_000),
      redirect: "follow",
    });
    if (!upstream.ok) {
      return Response.json(
        { error: "upstream_error", upstreamStatus: upstream.status },
        { status: 502 }
      );
    }
    const ct = upstream.headers.get("content-type") || "application/octet-stream";
    const buf = await upstream.arrayBuffer();
    return new Response(buf, {
      headers: {
        "Content-Type": ct,
        "Cache-Control": "public, max-age=300",
      },
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "fetch failed";
    return Response.json({ error: "proxy_failed", message: msg }, { status: 502 });
  }
}
