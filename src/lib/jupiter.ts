/**
 * Real Jupiter quote API — public endpoint works without API key.
 * Execute path is gated on wallet signing / ClawPump / PayBox.
 */

const JUPITER_QUOTE =
  process.env.JUPITER_QUOTE_URL || "https://lite-api.jup.ag/swap/v1/quote";
const JUPITER_SWAP =
  process.env.JUPITER_SWAP_URL || "https://lite-api.jup.ag/swap/v1/swap";

export async function getJupiterQuote(params: {
  inputMint: string;
  outputMint: string;
  amount: string;
  slippageBps?: number;
}) {
  const q = new URLSearchParams({
    inputMint: params.inputMint,
    outputMint: params.outputMint,
    amount: params.amount,
    slippageBps: String(params.slippageBps ?? 50),
  });
  const res = await fetch(`${JUPITER_QUOTE}?${q.toString()}`, {
    headers: { Accept: "application/json" },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Jupiter quote failed (${res.status}): ${text.slice(0, 500)}`);
  }
  return res.json();
}

export async function getJupiterSwapTransaction(body: {
  quoteResponse: unknown;
  userPublicKey: string;
  wrapAndUnwrapSol?: boolean;
}) {
  const res = await fetch(JUPITER_SWAP, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({
      quoteResponse: body.quoteResponse,
      userPublicKey: body.userPublicKey,
      wrapAndUnwrapSol: body.wrapAndUnwrapSol ?? true,
    }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Jupiter swap failed (${res.status}): ${text.slice(0, 500)}`);
  }
  return res.json();
}
