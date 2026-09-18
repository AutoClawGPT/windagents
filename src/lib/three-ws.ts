/** three.ws MCP Studio helpers — real forge_avatar proxy (no fake meshes). */

export const THREE_WS_MCP_STUDIO = "https://three.ws/api/mcp-studio";
export const DEFAULT_AVATAR_GLB = "https://three.ws/avatars/default.glb";

type JsonRpcResult = {
  jsonrpc?: string;
  id?: unknown;
  result?: {
    content?: Array<{ type?: string; text?: string; data?: unknown }>;
    structuredContent?: Record<string, unknown>;
    isError?: boolean;
  };
  error?: { message?: string; code?: number };
};

function pickGlbUrl(payload: unknown): string | null {
  if (!payload || typeof payload !== "object") return null;
  const o = payload as Record<string, unknown>;
  const candidates = [
    o.glbUrl,
    o.glb_url,
    o.url,
    o.body,
    o.avatarUrl,
    o.avatar_url,
    o.modelUrl,
    o.model_url,
  ];
  for (const c of candidates) {
    if (typeof c === "string" && /\.glb(\?|$)/i.test(c)) return c;
    if (typeof c === "string" && c.startsWith("http") && c.includes("glb")) return c;
  }
  // nested
  for (const key of ["model", "avatar", "asset", "data", "result"]) {
    if (o[key]) {
      const nested = pickGlbUrl(o[key]);
      if (nested) return nested;
    }
  }
  return null;
}

function extractUrlFromText(text: string): string | null {
  const m =
    text.match(/https?:\/\/[^\s"'<>]+\.glb[^\s"'<>]*/i) ||
    text.match(/https?:\/\/three\.ws\/[^\s"'<>]+/i);
  return m ? m[0].replace(/[),.;]+$/, "") : null;
}

export async function forgeAvatarViaThreeWs(prompt: string, opts?: { timeoutMs?: number }) {
  const timeoutMs = opts?.timeoutMs ?? 120_000;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(THREE_WS_MCP_STUDIO, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method: "tools/call",
        params: {
          name: "forge_avatar",
          arguments: { prompt },
        },
      }),
      signal: controller.signal,
    });

    const text = await res.text();
    let data: JsonRpcResult;
    try {
      data = JSON.parse(text) as JsonRpcResult;
    } catch {
      return {
        ok: false as const,
        error: `three.ws returned non-JSON (${res.status})`,
        raw: text.slice(0, 500),
      };
    }

    if (!res.ok || data.error) {
      return {
        ok: false as const,
        error: data.error?.message || `three.ws HTTP ${res.status}`,
        raw: data,
      };
    }

    if (data.result?.isError) {
      const errText = data.result.content?.map((c) => c.text).filter(Boolean).join("\n");
      return { ok: false as const, error: errText || "forge_avatar reported error", raw: data };
    }

    let glbUrl =
      pickGlbUrl(data.result?.structuredContent) ||
      pickGlbUrl(data.result);

    if (!glbUrl && data.result?.content) {
      for (const part of data.result.content) {
        if (part.text) {
          glbUrl = extractUrlFromText(part.text) || pickGlbUrl(safeJson(part.text));
          if (glbUrl) break;
        }
        if (part.data) {
          glbUrl = pickGlbUrl(part.data);
          if (glbUrl) break;
        }
      }
    }

    if (!glbUrl) {
      return {
        ok: false as const,
        error: "forge_avatar completed but no GLB URL found in response",
        raw: data,
      };
    }

    return { ok: true as const, glbUrl, raw: data };
  } catch (e: unknown) {
    const msg =
      e instanceof Error
        ? e.name === "AbortError"
          ? `forge_avatar timed out after ${timeoutMs}ms`
          : e.message
        : "forge_avatar failed";
    return { ok: false as const, error: msg };
  } finally {
    clearTimeout(timer);
  }
}

function safeJson(s: string): unknown {
  try {
    return JSON.parse(s);
  } catch {
    return null;
  }
}

export function buildAvatarPrompt(name: string, persona?: string | null, extra?: string | null) {
  const bits = [
    `Full-body 3D character avatar for AI agent named "${name}".`,
    persona ? `Persona: ${persona}.` : "",
    extra || "",
    "Stylized game-ready humanoid, standing pose, clean topology, Aeolian cyan energy accents (#5eead4).",
  ].filter(Boolean);
  return bits.join(" ").slice(0, 1000);
}
