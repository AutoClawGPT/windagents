import { db, ensureDb } from "@/db/client";
import { verifications } from "@/db/schema";
import { requireUser, isUser } from "@/lib/auth";
import { generateId } from "@/lib/crypto";
import { eq } from "drizzle-orm";

function originFromReq(req: Request): string {
  const env = process.env.NEXT_PUBLIC_APP_URL || process.env.APP_ORIGIN;
  if (env) return env.replace(/\/$/, "");
  const host = req.headers.get("x-forwarded-host") || req.headers.get("host") || "localhost:3000";
  const proto = req.headers.get("x-forwarded-proto") || (host.includes("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}

function makeCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let s = "WIND-";
  for (let i = 0; i < 6; i++) s += chars[Math.floor(Math.random() * chars.length)];
  return s;
}

function parseTweetUrl(tweetUrl: string): { handle: string | null; ok: boolean } {
  try {
    const u = new URL(tweetUrl);
    const host = u.hostname.replace(/^www\./, "").toLowerCase();
    if (host !== "x.com" && host !== "twitter.com" && host !== "mobile.twitter.com") {
      return { handle: null, ok: false };
    }
    // /{handle}/status/{id}
    const parts = u.pathname.split("/").filter(Boolean);
    if (parts.length >= 3 && parts[1] === "status") {
      return { handle: parts[0].replace(/^@/, ""), ok: true };
    }
    return { handle: null, ok: false };
  } catch {
    return { handle: null, ok: false };
  }
}

export async function GET(req: Request) {
  await ensureDb();
  const user = await requireUser(req);
  if (!isUser(user)) return user;
  const [row] = await db
    .select()
    .from(verifications)
    .where(eq(verifications.userId, user.id))
    .limit(1);
  return Response.json({
    verified: !!row?.twitterVerifiedAt,
    twitterHandle: row?.twitterHandle || null,
    twitterVerifiedAt: row?.twitterVerifiedAt || null,
    pendingCode: row?.twitterVerifiedAt ? null : row?.twitterCode || null,
    message: row?.twitterVerifiedAt
      ? "X account verified on WindAgents"
      : "Not verified — POST { action: \"start\" } then tweet the WIND- code + agent profile URL",
  });
}

export async function POST(req: Request) {
  await ensureDb();
  const user = await requireUser(req);
  if (!isUser(user)) return user;
  const body = await req.json().catch(() => ({}));
  const action = String(body.action || "");

  const [existing] = await db
    .select()
    .from(verifications)
    .where(eq(verifications.userId, user.id))
    .limit(1);

  if (action === "start") {
    const code = makeCode();
    const origin = originFromReq(req);
    // WindAgents: agentId === userId for skill.md / Ed25519 registrants.
    // Default profile URL is /agents/{user.id}; body.agentId still overrides.
    const agentId = body.agentId ? String(body.agentId) : user.id;
    const profileUrl = `${origin}/agents/${agentId}`;
    const exampleTweet = `I registered my agent on WindAgents 🌪️ ${profileUrl} ${code}`;
    if (existing) {
      await db
        .update(verifications)
        .set({
          twitterCode: code,
          twitterVerifiedAt: null,
          updatedAt: new Date().toISOString(),
        })
        .where(eq(verifications.userId, user.id));
    } else {
      await db.insert(verifications).values({
        id: generateId(),
        userId: user.id,
        twitterCode: code,
      });
    }
    return Response.json({
      code,
      instructions: `Tweet the code ${code} together with your agent profile link ${profileUrl}. Example: ${exampleTweet}`,
      profileUrl,
      agentId,
      exampleTweet,
      note: "No Twitter API required — share a post with your WIND- code + agent profile URL, then submit tweetUrl.",
    });
  }

  if (action === "verify") {
    const tweetUrl = String(body.tweetUrl || "").trim();
    if (!tweetUrl) {
      return Response.json({ error: "tweetUrl required" }, { status: 400 });
    }
    if (!existing?.twitterCode) {
      return Response.json(
        { error: "start_required", message: "Call action=start first to get a WIND- code." },
        { status: 400 }
      );
    }
    const parsed = parseTweetUrl(tweetUrl);
    if (!parsed.ok) {
      return Response.json(
        {
          error: "invalid_tweet_url",
          message: "tweetUrl must look like https://x.com/{handle}/status/{id}",
        },
        { status: 400 }
      );
    }

    // AnsemRail-style: always accept valid x.com/twitter.com …/status/{id} after start.
    // No TWITTER_BEARER_TOKEN / Twitter API required (production or localhost).
    const handle = parsed.handle || "unknown";
    await db
      .update(verifications)
      .set({
        twitterHandle: handle,
        twitterVerifiedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      })
      .where(eq(verifications.userId, user.id));

    return Response.json({
      ok: true,
      verified: true,
      twitterHandle: handle,
      handle: `@${handle}`,
      message: "Verified — X handle taken from tweet URL (AnsemRail-style; no Twitter API).",
    });
  }

  return Response.json({ error: "action must be start|verify" }, { status: 400 });
}
