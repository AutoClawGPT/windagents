import { db, ensureDb } from "@/db/client";
import { users, registrations } from "@/db/schema";
import { generateId, generateToken, hashToken, encryptApiKey, signAccessToken } from "@/lib/crypto";
import { createSession } from "@/lib/auth";
import { eq } from "drizzle-orm";

export async function POST(req: Request) {
  try {
    await ensureDb();
    const body = await req.json();
    const email = String(body.email || "").trim().toLowerCase();
    const walletAddress = body.walletAddress ? String(body.walletAddress).trim() : null;
    const displayName = body.displayName ? String(body.displayName).trim() : null;
    const clawpumpApiKey = body.clawpumpApiKey ? String(body.clawpumpApiKey).trim() : null;
    const payboxApiKey = body.payboxApiKey ? String(body.payboxApiKey).trim() : null;

    if (!email || !email.includes("@")) {
      return Response.json({ error: "Valid email required" }, { status: 400 });
    }

    const [existing] = await db.select().from(users).where(eq(users.email, email)).limit(1);
    if (existing) {
      return Response.json({ error: "Email already registered. Use /login or agent-login." }, { status: 409 });
    }

    const userId = generateId();
    const authToken = signAccessToken({ sub: userId, typ: "human", name: displayName, email });
    const encryptedKeys: Record<string, string> = {};
    if (clawpumpApiKey) {
      if (!clawpumpApiKey.startsWith("cpk_")) {
        return Response.json({ error: "clawpumpApiKey must start with cpk_" }, { status: 400 });
      }
      encryptedKeys.clawpumpApiKey = encryptApiKey(clawpumpApiKey);
    }
    if (payboxApiKey) {
      if (!payboxApiKey.startsWith("pbx_")) {
        return Response.json({ error: "payboxApiKey must start with pbx_" }, { status: 400 });
      }
      encryptedKeys.payboxApiKey = encryptApiKey(payboxApiKey);
    }

    await db.insert(users).values({
      id: userId,
      type: "human",
      email,
      walletAddress,
      displayName,
      authTokenHash: hashToken(authToken),
      payoutWallet: walletAddress,
      encryptedKeys: Object.keys(encryptedKeys).length ? JSON.stringify(encryptedKeys) : null,
    });

    await db.insert(registrations).values({
      id: generateId(),
      userId,
      type: "human",
      status: "active",
      payload: JSON.stringify({ email, walletAddress }),
    });

    await createSession(userId, authToken);

    return Response.json({
      userId,
      authToken,
      message: "Human registered successfully. SAVE the authToken — shown only once. Use as Bearer token.",
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Registration failed";
    return Response.json({ error: msg }, { status: 500 });
  }
}
