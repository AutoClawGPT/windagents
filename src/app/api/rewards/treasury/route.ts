import { requireUser, isUser } from "@/lib/auth";

function isAdmin(req: Request): boolean {
  const admin = process.env.ADMIN_TOKEN || "";
  if (!admin) return false;
  const header = req.headers.get("authorization") || "";
  const bearer = header.startsWith("Bearer ") ? header.slice(7).trim() : "";
  const alt = req.headers.get("x-admin-token") || "";
  return bearer === admin || alt === admin;
}

export async function GET(req: Request) {
  const user = await requireUser(req);
  if (!isUser(user)) return user;
  if (!isAdmin(req)) {
    return Response.json({ error: "admin_required" }, { status: 403 });
  }
  const hasTreasury = !!(process.env.TREASURY_KEY || process.env.BOUNTY_TREASURY_KEY);
  return Response.json({
    status: hasTreasury ? "key_present_unsigned" : "pending",
    balances: null,
    message: hasTreasury
      ? "Treasury key present but live balance fetch not wired — balances stay null (never invented)."
      : "No TREASURY_KEY — treasury status pending.",
  });
}

export async function POST(req: Request) {
  const user = await requireUser(req);
  if (!isUser(user)) return user;
  if (!isAdmin(req)) {
    return Response.json({ error: "admin_required" }, { status: 403 });
  }
  return Response.json({
    ok: false,
    status: "pending",
    message: "Treasury payout stub — no fake signatures. Configure and wire TREASURY_KEY for real sends.",
    txSignature: null,
  });
}
