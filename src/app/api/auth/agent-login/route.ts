import { db, ensureDb } from "@/db/client";
import { users } from "@/db/schema";
import { hashToken, verifyAccessToken } from "@/lib/crypto";
import { createSession } from "@/lib/auth";
import { verifyEd25519 } from "@/lib/ed25519";
import { ensurePublicAgentRow } from "@/lib/ensure-agent-profile";
import { registryGetUser, registryPutUser, registryIsDeleted } from "@/lib/registry-upstash";
import { eq } from "drizzle-orm";
import { normalizeAgentToken } from "@/lib/normalize-agent-token";
import { registryGetClaimToken } from "@/lib/registry-upstash";

function cleanToken(raw: string): string {
  return normalizeAgentToken(raw);
}

async function resolveUserFromWa1(token: string) {
  const claims = verifyAccessToken(token);
  if (!claims) return null;

  if (await registryIsDeleted(claims.sub)) {
    return null;
  }

  await ensureDb();
  let [user] = await db.select().from(users).where(eq(users.id, claims.sub)).limit(1);

  if (!user) {
    // Heal after /tmp SQLite loss — recreate from wa1 claims (+ durable Redis registry if present)
    const reg = await registryGetUser(claims.sub);
    const now = new Date().toISOString();
    const displayName = claims.name || reg?.displayName || "Agent";
    await db.insert(users).values({
      id: claims.sub,
      type: claims.typ === "agent" ? "agent" : "human",
      email: claims.email ?? reg?.email ?? null,
      displayName,
      authTokenHash: hashToken(token),
      ed25519PublicKey: reg?.ed25519PublicKey ?? null,
      createdAt: now,
      updatedAt: now,
    });
    if (claims.typ === "agent") {
      await ensurePublicAgentRow({ userId: claims.sub, name: displayName });
    }
    await registryPutUser({
      id: claims.sub,
      type: claims.typ === "agent" ? "agent" : "human",
      displayName,
      email: claims.email ?? null,
      ed25519PublicKey: reg?.ed25519PublicKey ?? null,
      authTokenHash: hashToken(token),
      createdAt: reg?.createdAt || now,
      updatedAt: now,
    });
    [user] = await db.select().from(users).where(eq(users.id, claims.sub)).limit(1);
  } else if (!user.authTokenHash) {
    await db
      .update(users)
      .set({ authTokenHash: hashToken(token), updatedAt: new Date().toISOString() })
      .where(eq(users.id, user.id));
  }

  return user ?? null;
}

/**
 * Registration agentToken / authToken IS the long-lived Bearer (wa1.*).
 * Accepts:
 * 1) wa1.* HMAC tokens (works across Vercel isolates — preferred)
 * 2) authTokenHash lookup (legacy / same-isolate)
 * 3) Ed25519 challenge (does not re-issue token — paste original agentToken)
 */
export async function POST(req: Request) {
  try {
    const body = await req.json();

    // Short claim code (WAC-XXXXXXXX) — survives chat hosts that redact long wa1. JWTs
    const claimRaw = String(body.claim || body.claimCode || "").trim();
    if (claimRaw && !body.agentToken && !body.authToken && !body.token) {
      const claimed = await registryGetClaimToken(claimRaw);
      if (!claimed) {
        return Response.json(
          { error: "Invalid or expired claim code", ok: false },
          { status: 401 }
        );
      }
      body.token = claimed;
    }

    if (body.agentToken || body.authToken || body.token) {
      let token = cleanToken(String(body.agentToken || body.authToken || body.token));
      // Also allow pasting a claim code into the token field
      if (!token.startsWith("wa1.") && !token.startsWith("wa1.") && /^WAC-[A-F0-9]+$/i.test(token)) {
        const claimed = await registryGetClaimToken(token);
        if (!claimed) {
          return Response.json({ error: "Invalid or expired claim code", ok: false }, { status: 401 });
        }
        token = cleanToken(claimed);
      }
      if (!token) {
        return Response.json({ error: "token required", ok: false }, { status: 400 });
      }

      // Prefer stateless wa1 verify — survives ephemeral SQLite
      let user = token.startsWith("wa1.") ? await resolveUserFromWa1(token) : null;

      if (!user) {
        await ensureDb();
        const tokenHash = hashToken(token);
        const [row] = await db
          .select()
          .from(users)
          .where(eq(users.authTokenHash, tokenHash))
          .limit(1);
        user = row ?? null;
      }

      if (!user) {
        return Response.json(
          {
            error: "Invalid token",
            ok: false,
            message:
              "Paste the FULL plaintext agentToken (starts with wa1.). Not base64, not redacted with …, no extra quotes.",
          },
          { status: 401 }
        );
      }

      try {
        await createSession(user.id, token);
      } catch {
        /* session optional */
      }

      if (user.type === "agent") {
        await ensurePublicAgentRow({
          userId: user.id,
          name: user.displayName || "Agent",
        });
      }

      return Response.json({
        ok: true,
        userId: user.id,
        type: user.type,
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

    await ensureDb();
    const [user] = await db.select().from(users).where(eq(users.ed25519PublicKey, publicKey)).limit(1);
    if (!user) return Response.json({ error: "Agent not registered", ok: false }, { status: 404 });

    return Response.json({
      ok: true,
      userId: user.id,
      type: user.type,
      message:
        "Ed25519 verified. Paste your original FULL agentToken from registration as Bearer (shown only once at register — never redact).",
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
