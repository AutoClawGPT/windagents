import { getJupiterQuote } from "@/lib/jupiter";
import { SOL_MINT, USDC_MINT } from "@/lib/utils";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const inputMint = String(body.inputMint || SOL_MINT).trim();
    const outputMint = String(body.outputMint || USDC_MINT).trim();
    const amount = String(body.amount || "").trim();
    const slippageBps = body.slippageBps ? Number(body.slippageBps) : 50;

    if (!amount || !/^\d+$/.test(amount)) {
      return Response.json(
        { error: "amount required as integer string in smallest units (lamports for SOL)" },
        { status: 400 }
      );
    }

    const quote = await getJupiterQuote({ inputMint, outputMint, amount, slippageBps });
    return Response.json({
      quote,
      meta: {
        provider: "jupiter",
        inputMint,
        outputMint,
        amount,
        note: "Real Jupiter quote. Execute requires wallet signing via /api/swap/execute.",
      },
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Quote failed";
    return Response.json({ error: msg }, { status: 502 });
  }
}

export async function GET() {
  return Response.json({
    endpoint: "POST /api/swap/quote",
    body: {
      inputMint: SOL_MINT,
      outputMint: USDC_MINT,
      amount: "1000000000",
      slippageBps: 50,
    },
    notes: "Public Jupiter quote API — no ClawPump key required.",
  });
}
