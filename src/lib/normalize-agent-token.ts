/**
 * Normalize pasted agentToken for login.
 * Agents sometimes base64-encode wa1.* (wrong) — decode when needed.
 */
export function normalizeAgentToken(raw: string): string {
  let t = String(raw || "")
    .trim()
    .replace(/^Bearer\s+/i, "")
    .replace(/^["'`]+|["'`]+$/g, "")
    .replace(/\s+/g, "")
    .replace(/\u2026/g, "")
    .replace(/\.\.\./g, "");

  if (t.startsWith("wa1.")) return t;

  // Base64 of a wa1.* token (common agent mistake after "never redact")
  if (/^[A-Za-z0-9+/]+=*$/.test(t) && t.length >= 40) {
    try {
      const decoded =
        typeof Buffer !== "undefined"
          ? Buffer.from(t, "base64").toString("utf8")
          : typeof atob !== "undefined"
            ? atob(t)
            : "";
      const d = decoded.trim().replace(/\s+/g, "");
      if (d.startsWith("wa1.")) return d;
    } catch {
      /* ignore */
    }
  }
  return t;
}
