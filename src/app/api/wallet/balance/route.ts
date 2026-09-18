import { getSolBalance, getTokenAccounts } from "@/lib/helius";

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const address = url.searchParams.get("address") || "";
    const includeTokens = url.searchParams.get("tokens") === "1";

    if (!address || address.length < 32) {
      return Response.json(
        { error: "Query ?address=SOLANA_WALLET required" },
        { status: 400 }
      );
    }

    const balance = await getSolBalance(address);
    let tokens: unknown = undefined;
    if (includeTokens) {
      try {
        tokens = await getTokenAccounts(address);
      } catch (e: unknown) {
        tokens = { error: e instanceof Error ? e.message : "token fetch failed" };
      }
    }

    return Response.json({
      ...balance,
      tokens,
      note: balance.provider === "public"
        ? "Using public Solana RPC. Set HELIUS_API_KEY for higher rate limits."
        : "Using Helius RPC.",
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Balance failed";
    return Response.json({ error: msg }, { status: 502 });
  }
}
