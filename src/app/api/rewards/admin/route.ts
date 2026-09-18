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
    return Response.json(
      { error: "admin_required", message: "Set ADMIN_TOKEN and pass it as Bearer or x-admin-token." },
      { status: 403 }
    );
  }
  return Response.json({
    ok: true,
    role: "admin",
    message: "Admin recognized. Use POST to approve/reject submissions — no fake payouts.",
  });
}

export async function POST(req: Request) {
  const user = await requireUser(req);
  if (!isUser(user)) return user;
  if (!isAdmin(req)) {
    return Response.json(
      { error: "admin_required", message: "Set ADMIN_TOKEN and pass it as Bearer or x-admin-token." },
      { status: 403 }
    );
  }
  const body = await req.json().catch(() => ({}));
  return Response.json({
    ok: true,
    status: "pending",
    message:
      "Admin action acknowledged but treasury payout path is stubbed — no fake tx. Wire TREASURY_KEY for real payouts.",
    action: body.action || null,
    submissionId: body.submissionId || null,
  });
}
