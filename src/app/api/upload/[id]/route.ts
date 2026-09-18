import { db, ensureDb } from "@/db/client";
import { uploads } from "@/db/schema";
import { eq } from "drizzle-orm";
import fs from "fs";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: Request, ctx: Ctx) {
  await ensureDb();
  const { id } = await ctx.params;
  const [row] = await db.select().from(uploads).where(eq(uploads.id, id)).limit(1);
  if (!row) return Response.json({ error: "Not found" }, { status: 404 });
  if (!fs.existsSync(row.path)) {
    return Response.json({ error: "file_missing" }, { status: 404 });
  }
  const buf = fs.readFileSync(row.path);
  return new Response(buf, {
    headers: {
      "Content-Type": row.mime || "application/octet-stream",
      "Cache-Control": "public, max-age=86400",
      "Content-Length": String(buf.length),
    },
  });
}
