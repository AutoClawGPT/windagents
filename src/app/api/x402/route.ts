import { db } from "@/db/client";
import { x402Payments } from "@/db/schema";
import { requireUser, isUser, getBearerUser } from "@/lib/auth";
import { generateId } from "@/lib/crypto";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const action = url.searchParams.get("action") || "info";
  if (action === "info") {
    return Response.json({
      protocol: "x402",
      status: "informational",
      note: "WindAgents exposes x402 info + voluntary payment records. Registration, skills, wallet balance, and read endpoints are free.",
      freeEndpoints: [
        "/api/wallet/balance",
        "/api/skills",
        "/api/bounties",
        "/api/registry",
        "/api/marketplace",
        "/api/signals",
        "/skill.md",
      ],
    });
  }
  if (action === "stats") {
    const rows = await db.select().from(x402Payments);
    return Response.json({
      count: rows.length,
      totalRecords: rows.length,
    });
  }
  return Response.json({ error: "Unknown action" }, { status: 400 });
}

export async function POST(req: Request) {
  const user = await requireUser(req);
  if (!isUser(user)) return user;
  try {
    const body = await req.json();
    const amount = String(body.amount || "").trim();
    if (!amount) return Response.json({ error: "amount required" }, { status: 400 });
    const id = generateId();
    await db.insert(x402Payments).values({
      id,
      userId: user.id,
      payerAddress: body.payerAddress ? String(body.payerAddress) : user.walletAddress,
      amount,
      token: String(body.token || "SOL"),
      endpoint: body.endpoint ? String(body.endpoint) : null,
      txSignature: body.txSignature ? String(body.txSignature) : null,
    });
    return Response.json({ id, message: "Payment recorded" });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Record failed";
    return Response.json({ error: msg }, { status: 500 });
  }
}
