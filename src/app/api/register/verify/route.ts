import { verifyEd25519 } from "@/lib/ed25519";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const publicKey = String(body.publicKey || "").trim();
    const signature = String(body.signature || "").trim();
    const message = String(body.message || "");
    if (!publicKey || !signature || !message) {
      return Response.json({ error: "publicKey, signature, message required" }, { status: 400 });
    }
    const valid = verifyEd25519({ publicKey, signature, message });
    return Response.json({ valid, publicKey, message });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Verify failed";
    return Response.json({ error: msg }, { status: 500 });
  }
}
