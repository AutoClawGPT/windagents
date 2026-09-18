import { db } from "@/db/client";
import { users } from "@/db/schema";
import { hashToken } from "@/lib/crypto";
import { createSession } from "@/lib/auth";
import { verifyEd25519 } from "@/lib/ed25519";
import { eq } from "drizzle-orm";

/**
 * AnsemRail-compatible agent login:
 * The registration agentToken / authToken IS the long-lived Bearer.
 * We validate it, optionally refresh a session row, and return the SAME token.
 */
export async function POST(req: Request) {
  try {
    const body = await req.json();

    if (body.agentToken || body.authToken || body.token) {
      const token = String(body.agentToken || body.authToken || body.token)
        .trim()
        .replace(/^Bearer\s+/i, "");
      if (!token) {
        return Response.json({ error: "token required", ok: false }, { status: 400 });
      }
      const tokenHash = hashToken(token);
      const [user] = await db.select().from(users).where(eq(users.authTokenHash, tokenHash)).limit(1);
      if (!user) {
        return Response.json({ error: "Invalid token", ok: false }, { status: 401 });
      }

      // Keep a session row for tooling, but Bearer for clients is the registration token
      try {
        await createSession(user.id, token);
      } catch {
        // ignore duplicate/session errors — token auth still works via authTokenHash fallback
      }

      return Response.json({
        ok: true,
        userId: user.id,
        type: user.type,
        // CRITICAL: same token the user pasted — AnsemRail skill.md pattern
        authToken: token,
        agentToken: token,
        user: {
          id: user.id,
          email: user.email,
          type: user.type,
          walletAddress: user.walletAddress,
          displayName: user.displayName,
        },
        message: "Agent token valid. Use this Bearer for all API calls.",
      });
    }

    const publicKey = String(body.ed25519PublicKey || body.publicKey || "").trim();
    const signature = String(body.ed25519Signature || body.signature || "").trim();
    const message = String(body.message || "");
    if (!publicKey || !signature || !message) {
      return Response.json(
        { error: "Provide agentToken OR ed25519PublicKey+signature+message", ok: false },
        { status: 400 }
      );
    }
    if (!message.startsWith("windagents-login-")) {
      return Response.json(
        { error: "Message must start with windagents-login-<timestamp>", ok: false },
        { status: 400 }
      );
    }
    const valid = verifyEd25519({ publicKey, signature, message });
    if (!valid) return Response.json({ error: "Invalid signature", ok: false }, { status: 401 });

    const [user] = await db.select().from(users).where(eq(users.ed25519PublicKey, publicKey)).limit(1);
    if (!user) return Response.json({ error: "Agent not registered", ok: false }, { status: 404 });
    if (!user.authTokenHash) {
      return Response.json({ error: "No agent token on file — re-register", ok: false }, { status: 400 });
    }

    return Response.json({
      ok: true,
      userId: user.id,
      type: user.type,
      message:
        "Ed25519 verified. Paste your original agentToken from registration as Bearer (shown only once at register).",
      user: {
        id: user.id,
        email: user.email,
        type: user.type,
        walletAddress: user.walletAddress,
        displayName: user.displayName,
      },
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Login failed";
    return Response.json({ error: msg, ok: false }, { status: 500 });
  }
}
