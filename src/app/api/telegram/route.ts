export async function GET() {
  const configured = !!process.env.TELEGRAM_BOT_TOKEN;
  return Response.json({
    configured,
    webhook: "/api/telegram",
    message: configured
      ? "TELEGRAM_BOT_TOKEN set — POST webhook accepted"
      : "Set TELEGRAM_BOT_TOKEN to enable WindAgents bot webhook",
  });
}

export async function POST(req: Request) {
  if (!process.env.TELEGRAM_BOT_TOKEN) {
    return Response.json(
      {
        error: "not_configured",
        message: "Set TELEGRAM_BOT_TOKEN to enable WindAgents bot webhook",
      },
      { status: 501 }
    );
  }
  const body = await req.json().catch(() => ({}));
  return Response.json({
    ok: true,
    echo: typeof body === "object" ? { update_id: (body as { update_id?: number }).update_id } : {},
    message: "WindAgents telegram webhook stub — echo ok",
  });
}
