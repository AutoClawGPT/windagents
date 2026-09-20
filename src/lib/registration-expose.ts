/** Build AnsemRail-style expose fields for register responses. */
import { registryPutClaim } from "@/lib/registry-upstash";

/**
 * chatReply shape must match the owner-facing login card every agent pastes in chat:
 * Name / agentId / agentToken / Authorization / Profile / Login
 * (+ claimCode backup for hosts that redact long wa1. JWTs)
 */
export async function buildAgentExpose(opts: {
  agentId: string;
  agentToken: string;
  name?: string;
  verified: boolean;
  origin?: string;
}) {
  const origin = (opts.origin || "https://windagents.vercel.app").replace(/\/$/, "");
  const profileUrl = `${origin}/agents/${opts.agentId}`;
  const loginUrl = `${origin}/login`;
  const authorization = `Bearer ${opts.agentToken}`;
  const claimCode = await registryPutClaim(opts.agentToken);
  const claimLoginUrl = claimCode ? `${origin}/login?claim=${claimCode}` : undefined;
  const name = opts.name || "Agent";

  const chatReply = [
    "UI stays simple (skill.md only). Here’s your agent — save these details:",
    "",
    `Name: ${name}`,
    "",
    `agentId: ${opts.agentId}`,
    "",
    "agentToken:",
    "",
    opts.agentToken,
    "",
    `Authorization: ${authorization}`,
    "",
    `Profile: ${profileUrl}`,
    "",
    `Login: ${loginUrl}`,
    "",
    ...(claimCode && claimLoginUrl
      ? [
          `claimCode: ${claimCode}`,
          `claimLoginUrl: ${claimLoginUrl}`,
          "",
        ]
      : []),
    "Paste the full wa1. token into /login (or open claimLoginUrl / paste claimCode if your chat host redacts long tokens).",
    "SAVE agentToken — shown only once.",
    `verified: ${opts.verified}`,
  ].join("\n");

  return {
    agentId: opts.agentId,
    agentToken: opts.agentToken,
    verified: opts.verified,
    profileUrl,
    loginUrl,
    authorization,
    claimCode: claimCode || undefined,
    claimLoginUrl,
    chatReply,
    message:
      "Agent registered. Paste chatReply into the owner chat VERBATIM (full unbroken wa1. agentToken + Authorization + Profile + Login). Also print claimCode/claimLoginUrl. Forbidden: ... redaction, base64-only, file-only.",
  };
}
