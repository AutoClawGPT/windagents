import { db } from "@/db/client";
import { users } from "@/db/schema";
import { requireUser, isUser } from "@/lib/auth";
import { encryptApiKey } from "@/lib/crypto";
import { eq } from "drizzle-orm";

function maskKeys(encryptedKeysJson: string | null) {
  if (!encryptedKeysJson) {
    return {
      hasClawpump: false,
      hasPaybox: false,
      hasHelius: false,
      hasSolanaRpc: false,
      hasJupiterQuoteUrl: false,
      hasJupiterApiKey: false,
    };
  }
  try {
    const parsed = JSON.parse(encryptedKeysJson);
    return {
      hasClawpump: !!parsed.clawpumpApiKey,
      hasPaybox: !!parsed.payboxApiKey,
      hasHelius: !!parsed.heliusApiKey,
      hasSolanaRpc: !!parsed.solanaRpcUrl,
      hasJupiterQuoteUrl: !!parsed.jupiterQuoteUrl,
      hasJupiterApiKey: !!parsed.jupiterApiKey,
      keysConfigured: Object.keys(parsed),
    };
  } catch {
    return {
      hasClawpump: false,
      hasPaybox: false,
      hasHelius: false,
      hasSolanaRpc: false,
      hasJupiterQuoteUrl: false,
      hasJupiterApiKey: false,
    };
  }
}

function setOrClearVaultKey(
  keys: Record<string, string>,
  field: string,
  value: unknown,
  opts?: { prefix?: string; label?: string }
): Response | null {
  if (value === undefined) return null;
  const k = String(value || "");
  if (k === "") {
    delete keys[field];
    return null;
  }
  if (opts?.prefix && !k.startsWith(opts.prefix)) {
    return Response.json(
      { error: `${opts.label || field} must start with ${opts.prefix}` },
      { status: 400 }
    );
  }
  keys[field] = encryptApiKey(k);
  return null;
}

export async function GET(req: Request) {
  const user = await requireUser(req);
  if (!isUser(user)) return user;

  return Response.json({
    id: user.id,
    type: user.type,
    email: user.email,
    displayName: user.displayName,
    moonpayEmail: user.moonpayEmail,
    walletAddress: user.walletAddress,
    payoutWallet: user.payoutWallet,
    ed25519PublicKey: user.ed25519PublicKey,
    keys: maskKeys(user.encryptedKeys),
    // Never return raw keys
    createdAt: user.createdAt,
  });
}

export async function PUT(req: Request) {
  const user = await requireUser(req);
  if (!isUser(user)) return user;

  try {
    const body = await req.json();
    const updates: Partial<typeof users.$inferInsert> = {
      updatedAt: new Date().toISOString(),
    };

    if (body.displayName !== undefined) updates.displayName = String(body.displayName);
    if (body.walletAddress !== undefined) updates.walletAddress = String(body.walletAddress);
    if (body.payoutWallet !== undefined) updates.payoutWallet = String(body.payoutWallet);
    if (body.email !== undefined) updates.email = String(body.email).toLowerCase();
    if (body.moonpayEmail !== undefined) {
      const m = String(body.moonpayEmail || "").trim();
      updates.moonpayEmail = m === "" ? null : m.toLowerCase();
    }

    let keys: Record<string, string> = {};
    if (user.encryptedKeys) {
      try {
        keys = JSON.parse(user.encryptedKeys);
      } catch {}
    }

    const cpkErr = setOrClearVaultKey(keys, "clawpumpApiKey", body.clawpumpApiKey, {
      prefix: "cpk_",
      label: "clawpumpApiKey",
    });
    if (cpkErr) return cpkErr;

    const pbxErr = setOrClearVaultKey(keys, "payboxApiKey", body.payboxApiKey, {
      prefix: "pbx_",
      label: "payboxApiKey",
    });
    if (pbxErr) return pbxErr;

    const heliusErr = setOrClearVaultKey(keys, "heliusApiKey", body.heliusApiKey);
    if (heliusErr) return heliusErr;

    // Optional per-user RPC override (may embed a key in the URL — vault + mask)
    const rpcErr = setOrClearVaultKey(keys, "solanaRpcUrl", body.solanaRpcUrl);
    if (rpcErr) return rpcErr;

    // Optional Jupiter quote URL override + API key (quotes work without key)
    const jupUrlErr = setOrClearVaultKey(keys, "jupiterQuoteUrl", body.jupiterQuoteUrl);
    if (jupUrlErr) return jupUrlErr;
    const jupKeyErr = setOrClearVaultKey(keys, "jupiterApiKey", body.jupiterApiKey);
    if (jupKeyErr) return jupKeyErr;

    updates.encryptedKeys = Object.keys(keys).length ? JSON.stringify(keys) : null;

    await db.update(users).set(updates).where(eq(users.id, user.id));
    const [fresh] = await db.select().from(users).where(eq(users.id, user.id)).limit(1);

    return Response.json({
      ok: true,
      displayName: fresh?.displayName ?? null,
      moonpayEmail: fresh?.moonpayEmail ?? null,
      payoutWallet: fresh?.payoutWallet ?? null,
      walletAddress: fresh?.walletAddress ?? null,
      keys: maskKeys(fresh?.encryptedKeys ?? null),
      message: "Settings updated. Raw keys are encrypted at rest (AES-256-GCM) and never returned.",
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Update failed";
    return Response.json({ error: msg }, { status: 500 });
  }
}
