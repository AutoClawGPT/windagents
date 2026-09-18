import { requireUser, isUser } from "@/lib/auth";
import { getJupiterSwapTransaction } from "@/lib/jupiter";
import { extractClawpumpKey } from "@/lib/clawpump";
import { extractPayboxKey } from "@/lib/paybox";

export async function POST(req: Request) {
  const user = await requireUser(req);
  if (!isUser(user)) return user;

  try {
    const body = await req.json();
    const quoteResponse = body.quoteResponse || body.quote;
    const userPublicKey = String(body.userPublicKey || user.walletAddress || "").trim();

    if (!quoteResponse) {
      return Response.json({ error: "quoteResponse required (from /api/swap/quote)" }, { status: 400 });
    }
    if (!userPublicKey) {
      return Response.json(
        {
          error: "userPublicKey required",
          message: "Set walletAddress in Settings or pass userPublicKey.",
        },
        { status: 400 }
      );
    }

    const cpk = extractClawpumpKey(user.encryptedKeys);
    const pbx = extractPayboxKey(user.encryptedKeys);

    // Build unsigned swap tx via Jupiter — never broadcasts without a real signer path
    const swap = await getJupiterSwapTransaction({
      quoteResponse,
      userPublicKey,
    });

    if (!cpk && !pbx && !body.signedTransaction) {
      return Response.json(
        {
          error: "execute_gated",
          message:
            "Swap transaction built (unsigned). Broadcast requires: (1) connect cpk_/pbx_ for agent signing, OR (2) submit signedTransaction after client-side wallet sign. WindAgents never fakes fills.",
          swapTransaction: swap.swapTransaction || null,
          jupiter: swap,
          next: {
            connectKeys: "PUT /api/settings with clawpumpApiKey or payboxApiKey",
            orSign: "Sign swapTransaction with your wallet and POST signedTransaction",
          },
        },
        { status: 402 }
      );
    }

    if (body.signedTransaction) {
      return Response.json({
        error: "broadcast_not_wired_without_rpc_send",
        message:
          "Provide HELIUS_API_KEY / SOLANA_RPC and a signed tx broadcast path. Refusing to pretend the swap landed.",
        receivedSignedTx: true,
      }, { status: 501 });
    }

    return Response.json({
      status: "prepared",
      jupiter: swap,
      signing: cpk ? "clawpump_available" : pbx ? "paybox_available" : "none",
      message: "Unsigned swap ready. Complete signing via PayBox/ClawPump or local wallet.",
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Execute failed";
    return Response.json({ error: msg }, { status: 502 });
  }
}
