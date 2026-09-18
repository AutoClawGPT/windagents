/**
 * ClawPump launch proxies (PONS + gasless pump.fun / claw).
 * Uses the user's own cpk_ — never fabricates token addresses or tx hashes.
 * Payment-required responses (401/402 + pay / LAUNCH_PAYMENT_REQUIRED) pass through honestly.
 */
import { extractClawpumpKey, clawpumpFetch } from "./clawpump";
import { connectKeyError } from "./utils";
import type { User } from "@/db/schema";

export function requireCpk(user: User) {
  const cpk = extractClawpumpKey(user.encryptedKeys);
  if (!cpk) {
    return {
      ok: false as const,
      response: connectKeyError(
        "ClawPump",
        "PUT /api/settings { clawpumpApiKey: 'cpk_...' } — required for PONS / claw launches"
      ),
    };
  }
  return { ok: true as const, cpk };
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

export async function proxyClawpumpJson(
  cpk: string,
  path: string,
  init: RequestInit = {}
): Promise<Response> {
  let upstream: Response;
  try {
    upstream = await clawpumpFetch(path, cpk, init);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "unreachable";
    return Response.json(
      {
        error: "upstream_unavailable",
        upstreamStatus: 0,
        message: `ClawPump ${path} unreachable: ${msg}`,
      },
      { status: 502 }
    );
  }

  const text = await upstream.text();
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    data = { raw: text };
  }

  if (!upstream.ok) {
    const status =
      upstream.status === 503
        ? 503
        : upstream.status >= 400 && upstream.status < 600
          ? upstream.status
          : 502;

    // Honest pass-through for payment / allowance errors (pay, LAUNCH_PAYMENT_REQUIRED, etc.)
    if (
      isRecord(data) &&
      (data.pay ||
        data.selfFunded ||
        data.payment ||
        data.accepts ||
        data.code === "LAUNCH_PAYMENT_REQUIRED" ||
        data.code === "PAYMENT-REQUIRED" ||
        data.error === "LAUNCH_PAYMENT_REQUIRED" ||
        data.error === "PAYMENT-REQUIRED")
    ) {
      return Response.json(
        {
          ...data,
          upstreamStatus: upstream.status,
          message:
            typeof data.message === "string"
              ? data.message
              : `ClawPump requires payment/allowance for ${path} — not faked as success.`,
        },
        { status }
      );
    }

    return Response.json(
      {
        error: typeof (data as { error?: string })?.error === "string"
          ? (data as { error: string }).error
          : "upstream_error",
        upstreamStatus: upstream.status,
        message: `ClawPump ${path} returned ${upstream.status}`,
        ...(isRecord(data) ? data : { upstream: data }),
      },
      { status }
    );
  }

  return Response.json(data, { status: upstream.status === 202 ? 202 : 200 });
}

/** Resolve ClawPump agent id from WindAgents local agent id or raw clawpump id. */
export async function resolveClawpumpAgentId(
  userId: string,
  agentId: string
): Promise<{ clawpumpAgentId: string | null; localId: string | null }> {
  const { db } = await import("@/db/client");
  const { agents } = await import("@/db/schema");
  const { eq, and } = await import("drizzle-orm");

  const [local] = await db
    .select()
    .from(agents)
    .where(and(eq(agents.id, agentId), eq(agents.userId, userId)))
    .limit(1);
  if (local?.clawpumpAgentId) {
    return { clawpumpAgentId: local.clawpumpAgentId, localId: local.id };
  }
  if (local) {
    return { clawpumpAgentId: null, localId: local.id };
  }
  // Treat as raw ClawPump agent id
  return { clawpumpAgentId: agentId, localId: null };
}

/** Try ClawPump platform path outside /api/v1 (docs: GET /api/agents/.../pons/launches/:id). */
export async function proxyClawpumpPlatformJson(
  cpk: string,
  path: string,
  init: RequestInit = {}
): Promise<Response> {
  const base = (process.env.CLAWPUMP_PLATFORM_URL || "https://clawpump.tech/api").replace(/\/$/, "");
  const p = path.startsWith("/") ? path : `/${path}`;
  let upstream: Response;
  try {
    const headers = new Headers(init.headers);
    headers.set("Authorization", `Bearer ${cpk}`);
    headers.set("Content-Type", "application/json");
    headers.set("Accept", "application/json");
    upstream = await fetch(`${base}${p}`, { ...init, headers, signal: AbortSignal.timeout(20_000) });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "unreachable";
    return Response.json(
      {
        error: "upstream_unavailable",
        upstreamStatus: 0,
        message: `ClawPump platform ${path} unreachable: ${msg}`,
      },
      { status: 502 }
    );
  }
  const text = await upstream.text();
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    data = { raw: text };
  }
  if (!upstream.ok) {
    return Response.json(
      {
        error: typeof (data as { error?: string })?.error === "string"
          ? (data as { error: string }).error
          : "upstream_error",
        upstreamStatus: upstream.status,
        message: `ClawPump platform ${path} returned ${upstream.status}`,
        ...(typeof data === "object" && data !== null && !Array.isArray(data) ? data : { upstream: data }),
      },
      { status: upstream.status >= 400 && upstream.status < 600 ? upstream.status : 502 }
    );
  }
  return Response.json(data, { status: upstream.status === 202 ? 202 : 200 });
}

/** Honest degrade when Partner/platform poll paths are missing (404/405). */
export function launchPollUnavailable(kind: "pons" | "claw", tried: string[]) {
  return Response.json(
    {
      error: "unavailable",
      kind,
      available: false,
      message:
        kind === "pons"
          ? "ClawPump PONS launch history/poll is not available on documented Partner API list paths. POST /launch/pons still works (may return payment_required). Poll with launchId via GET /api/agents/{id}/pons/launches?launchId= when upstream exposes it."
          : "ClawPump gasless /launch/claw path is retired. Use POST /api/launch (Partner POST /launch) or POST /api/launch/claw which now proxies /launch. Payment-required responses are returned honestly.",
      tried,
      docs: "https://clawpump.tech/developers",
    },
    { status: 503 }
  );
}
