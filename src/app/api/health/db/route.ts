import {
  getDatabaseMode,
  isDurableDatabase,
  getDurableBackend,
} from "@/db/client";
import {
  isRegistryConfigured,
  isRedisUrlConfigured,
  isUpstashConfigured,
} from "@/lib/registry-upstash";

/** Public registry durability probe — no secrets. */
export async function GET() {
  const mode = getDatabaseMode();
  const durable = isDurableDatabase();
  const backend = getDurableBackend();
  const onVercel = process.env.VERCEL === "1" || !!process.env.VERCEL_ENV;
  return Response.json({
    ok: durable || !onVercel,
    mode,
    durable,
    backend,
    redisUrl: isRedisUrlConfigured(),
    upstash: isUpstashConfigured(),
    registry: isRegistryConfigured(),
    onVercel,
    message: durable
      ? backend === "redis"
        ? "Redis Cloud (REDIS_URL) registry — skill.md registrations persist across instances."
        : backend === "upstash"
          ? "Upstash Redis registry — skill.md registrations persist across instances."
          : "Remote libsql — registrations persist across instances."
      : onVercel
        ? "No durable registry yet — set REDIS_URL (Redis Cloud) on Vercel, or UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN, or libsql DATABASE_URL — or skill.md profiles will vanish."
        : "Local file SQLite is fine for localhost.",
  });
}
