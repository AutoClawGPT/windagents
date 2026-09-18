/** Proxy helpers for MoonPay Agents public token tools — never invent tokens. */

const MOONPAY_TOOLS = "https://agents.moonpay.com/api/tools";

export async function moonpayToolProxy(
  tool: "token_trending_list" | "token_search" | "token_retrieve",
  body: Record<string, unknown>
): Promise<Response> {
  let upstream: Response;
  try {
    upstream = await fetch(`${MOONPAY_TOOLS}/${tool}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(20_000),
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "upstream unreachable";
    return Response.json(
      {
        error: "upstream_unavailable",
        upstreamStatus: 0,
        message: `MoonPay Agents ${tool} unreachable: ${msg}`,
      },
      { status: 502 }
    );
  }

  const text = await upstream.text();
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    data = { raw: text };
  }

  if (!upstream.ok) {
    return Response.json(
      {
        error: "upstream_error",
        upstreamStatus: upstream.status,
        message: `MoonPay Agents ${tool} returned ${upstream.status}`,
        upstream: data,
      },
      { status: 502 }
    );
  }

  return Response.json(data, {
    headers: { "Cache-Control": "public, max-age=30" },
  });
}
