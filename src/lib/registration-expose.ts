/** Build AnsemRail-style expose fields for register responses. */
export function buildAgentExpose(opts: {
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
  const chatReply = [
    "WindAgents registration complete.",
    "",
    `name: ${opts.name || "Agent"}`,
    `agentId: ${opts.agentId}`,
    `agentToken: ${opts.agentToken}`,
    `Authorization: ${authorization}`,
    `Profile: ${profileUrl}`,
    `Login: ${loginUrl}`,
    `verified: ${opts.verified}`,
    "",
    "Paste agentToken into /login to open the dashboard.",
    "SAVE agentToken — shown only once.",
  ].join("\n");

  return {
    agentId: opts.agentId,
    agentToken: opts.agentToken,
    verified: opts.verified,
    profileUrl,
    loginUrl,
    authorization,
    chatReply,
    message:
      "Agent registered. Paste the chatReply field into chat for the human (full agentToken plaintext). SAVE agentToken — shown only once.",
  };
}
