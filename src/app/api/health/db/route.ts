import { getDatabaseMode, isDurableDatabase } from "@/db/client";

/** Public DB durability probe — no secrets. */
export async function GET() {
  const mode = getDatabaseMode();
  const durable = isDurableDatabase();
  const onVercel = process.env.VERCEL === "1" || !!process.env.VERCEL_ENV;
  return Response.json({
    ok: durable || !onVercel,
    mode,
    durable,
    onVercel,
    message: durable
      ? "Remote libsql/Turso — registrations persist across instances."
      : onVercel
        ? "EPHEMERAL file/tmp SQLite on Vercel — set DATABASE_URL=libsql://… + TURSO_AUTH_TOKEN or profiles will vanish."
        : "Local file SQLite is fine for localhost.",
  });
}
