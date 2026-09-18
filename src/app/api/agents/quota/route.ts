import { requireUser, isUser } from "@/lib/auth";
import { extractClawpumpKey, clawpumpFetch } from "@/lib/clawpump";

export async function GET(req: Request) {
  const user = await requireUser(req);
  if (!isUser(user)) return user;

  const cpk = extractClawpumpKey(user.encryptedKeys);
  const base = {
    connected: !!cpk,
    hasOwnKey: !!cpk,
    freeTierNote: "ClawPump free tier ~1000 msgs/day shared (clawpump.tech/docs)",
  };

  if (!cpk) {
    return Response.json({
      ...base,
      message:
        "No cpk_ connected. Connect your own ClawPump key in Settings for live quota/usage when ClawPump exposes it.",
      remaining: null,
      usage: null,
    });
  }

  // Try common quota/usage endpoints — never invent remaining counts
  const candidates = ["/usage", "/quota", "/account/usage", "/me/usage", "/billing/usage"];
  for (const path of candidates) {
    try {
      const res = await clawpumpFetch(path, cpk, { method: "GET" });
      if (res.ok) {
        const data = await res.json().catch(() => null);
        return Response.json({
          ...base,
          message: `Live usage from ClawPump ${path}`,
          source: path,
          usage: data,
          remaining: null,
          note: "remaining is only set when upstream provides an explicit field — never invented.",
        });
      }
    } catch {
      /* try next */
    }
  }

  return Response.json({
    ...base,
    message:
      "cpk_ present but ClawPump did not expose a known quota/usage endpoint. Free-tier note applies; remaining counts are not invented.",
    remaining: null,
    usage: null,
  });
}
