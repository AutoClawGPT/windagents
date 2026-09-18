import { requireUser, isUser } from "@/lib/auth";
import { requireCpk, proxyClawpumpJson } from "@/lib/clawpump-launch";

/** GET /api/launch/pump-pairs — ClawPump Partner API pump.fun pairs catalogue */
export async function GET(req: Request) {
  const user = await requireUser(req);
  if (!isUser(user)) return user;
  const gate = requireCpk(user);
  if (!gate.ok) return gate.response;
  return proxyClawpumpJson(gate.cpk, "/pump-pairs");
}
