import { moonpayToolProxy } from "@/lib/moonpay-tools";

export async function POST(req: Request) {
  let body: Record<string, unknown> = {};
  try {
    body = await req.json();
  } catch {
    body = {};
  }
  const chain = typeof body.chain === "string" ? body.chain : "solana";
  const limit = typeof body.limit === "number" ? body.limit : Number(body.limit) || 20;
  const page = typeof body.page === "number" ? body.page : Number(body.page) || 1;
  return moonpayToolProxy("token_trending_list", { chain, limit, page });
}
