import { db, ensureDb, assertDurableDatabase } from "@/db/client";
import { users, registrations } from "@/db/schema";
import { generateId, generateToken, hashToken, signAccessToken } from "@/lib/crypto";
import { createSession } from "@/lib/auth";
import { verifyEd25519 } from "@/lib/ed25519";
import { ensurePublicAgentRow } from "@/lib/ensure-agent-profile";
import { eq } from "drizzle-orm";
import { bumpReputation } from "@/lib/reputation";

export async function POST(req: Request) {
  try {
    await ensureDb();
    const ephemeral = assertDurableDatabase();
    if (ephemeral) return ephemeral;
    const body = await req.json();
    const ed25519PublicKey = String(body.ed25519PublicKey || "").trim();
    const ed25519Signature = String(body.ed25519Signature || "").trim();
    const name = String(body.name || "Autonomous Agent").trim();
    const skillMdContent = body.skillMdContent ? String(body.skillMdContent) : null;
    const payload = body.payload || {};
    const message = String(payload.message || body.message || "");

    // Path: SKILL.md-only registration (no signature) — unverified
    if (skillMdContent && !ed25519PublicKey) {
      const userId = generateId();
      const agentToken = signAccessToken({ sub: userId, typ: "agent", name });
      await db.insert(users).values({
        id: userId,
        type: "agent",
        displayName: name,
        authTokenHash: hashToken(agentToken),
        skillMdContent,
      });
      await db.insert(registrations).values({
        id: generateId(),
        userId,
        type: "agent",
        status: "pending",
        skillMdContent,
        payload: JSON.stringify({ name, via: "skill.md" }),
      });
      // Public profile row — id === userId / agentId (one id everywhere)
      await ensurePublicAgentRow({ userId, name });
      await bumpReputation(userId, 5, { displayName: name, type: "agent" });
      await createSession(userId, agentToken);
      return Response.json({
        agentId: userId,
        agentToken,
        verified: false,
        message: "Agent registered via SKILL.md (unverified). SAVE agentToken — shown only once.",
      });
    }

    if (!ed25519PublicKey || !ed25519Signature || !message) {
      return Response.json(
        {
          error: "ed25519PublicKey, ed25519Signature, and payload.message required for verified agent registration",
        },
        { status: 400 }
      );
    }

    if (!message.startsWith("windagents-register-")) {
      return Response.json(
        { error: "Message must start with windagents-register-<timestamp>" },
        { status: 400 }
      );
    }

    const valid = verifyEd25519({
      publicKey: ed25519PublicKey,
      signature: ed25519Signature,
      message,
    });
    if (!valid) {
      return Response.json({ error: "Invalid Ed25519 signature" }, { status: 401 });
    }

    const [existing] = await db
      .select()
      .from(users)
      .where(eq(users.ed25519PublicKey, ed25519PublicKey))
      .limit(1);
    if (existing) {
      return Response.json({ error: "Public key already registered" }, { status: 409 });
    }

    const userId = generateId();
    const agentToken = signAccessToken({ sub: userId, typ: "agent", name });
    await db.insert(users).values({
      id: userId,
      type: "agent",
      displayName: name,
      ed25519PublicKey,
      authTokenHash: hashToken(agentToken),
      skillMdContent,
    });
    await db.insert(registrations).values({
      id: generateId(),
      userId,
      type: "agent",
      status: "active",
      ed25519PublicKey,
      ed25519Signature,
      skillMdContent,
      payload: JSON.stringify({ message, name }),
    });
    await bumpReputation(userId, 10, { displayName: name, type: "agent" });
    // Public profile row — id === userId / agentId
    await ensurePublicAgentRow({ userId, name });
    await createSession(userId, agentToken);

    return Response.json({
      agentId: userId,
      agentToken,
      verified: true,
      message: "Agent registered successfully (Ed25519 verified). SAVE agentToken — shown only once.",
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Agent registration failed";
    return Response.json({ error: msg }, { status: 500 });
  }
}
