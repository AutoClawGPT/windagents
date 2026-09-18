import { db, ensureDb } from "@/db/client";
import { uploads } from "@/db/schema";
import { requireUser, isUser } from "@/lib/auth";
import { generateId } from "@/lib/crypto";
import fs from "fs";
import path from "path";

const MAX_BYTES = 2 * 1024 * 1024;
const UPLOAD_DIR = path.join(process.cwd(), "data", "uploads");

function ensureUploadDir() {
  if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

function parseDataUrl(dataUrl: string): { mime: string; buffer: Buffer } | null {
  const m = /^data:([^;]+);base64,([\s\S]+)$/.exec(dataUrl);
  if (!m) return null;
  return { mime: m[1], buffer: Buffer.from(m[2], "base64") };
}

function fromImageField(image: string, mimeHint?: string): { mime: string; buffer: Buffer } | null {
  const s = image.trim();
  if (s.startsWith("data:")) return parseDataUrl(s);
  // raw base64
  try {
    return { mime: mimeHint || "image/png", buffer: Buffer.from(s, "base64") };
  } catch {
    return null;
  }
}

export async function POST(req: Request) {
  await ensureDb();
  const user = await requireUser(req);
  if (!isUser(user)) return user;

  ensureUploadDir();

  try {
    const ct = req.headers.get("content-type") || "";
    let mime = "application/octet-stream";
    let kind = "image";
    let buffer: Buffer;

    if (ct.includes("multipart/form-data")) {
      const form = await req.formData();
      const file = form.get("file") || form.get("image") || form.get("data");
      kind = String(form.get("kind") || "image");
      if (!file || typeof file === "string") {
        // string image field in multipart
        if (typeof file === "string" && file.length > 0) {
          const parsed = fromImageField(file, String(form.get("mime") || "") || undefined);
          if (!parsed) return Response.json({ error: "invalid image field" }, { status: 400 });
          mime = parsed.mime;
          buffer = parsed.buffer;
        } else {
          return Response.json({ error: "file required in multipart field file|image|data" }, { status: 400 });
        }
      } else {
        const ab = await file.arrayBuffer();
        buffer = Buffer.from(ab);
        mime = file.type || String(form.get("mime") || "application/octet-stream");
      }
    } else {
      const body = await req.json();
      kind = String(body.kind || "image");
      if (body.image != null) {
        const parsed = fromImageField(String(body.image), body.mime ? String(body.mime) : undefined);
        if (!parsed) return Response.json({ error: "invalid image (base64 or data URL)" }, { status: 400 });
        mime = parsed.mime;
        buffer = parsed.buffer;
      } else if (body.dataUrl) {
        const parsed = parseDataUrl(String(body.dataUrl));
        if (!parsed) return Response.json({ error: "invalid dataUrl" }, { status: 400 });
        mime = parsed.mime;
        buffer = parsed.buffer;
      } else if (body.base64) {
        mime = String(body.mime || "image/png");
        buffer = Buffer.from(String(body.base64), "base64");
      } else {
        return Response.json(
          { error: "Provide JSON { image } (base64|data URL) or { dataUrl|base64, mime, kind? } or multipart file" },
          { status: 400 }
        );
      }
    }

    if (kind !== "image" && kind !== "banner") {
      return Response.json({ error: "kind must be image|banner" }, { status: 400 });
    }
    if (buffer.length > MAX_BYTES) {
      return Response.json({ error: "file_too_large", message: "Max ~2MB" }, { status: 413 });
    }
    if (!mime.startsWith("image/") && mime !== "application/octet-stream") {
      return Response.json({ error: "only image mime types allowed" }, { status: 400 });
    }

    const id = generateId();
    const filePath = path.join(UPLOAD_DIR, id);
    fs.writeFileSync(filePath, buffer);

    await db.insert(uploads).values({
      id,
      userId: user.id,
      kind,
      mime,
      path: filePath,
      bytes: buffer.length,
    });

    return Response.json(
      { id, url: `/api/upload/${id}`, kind, mime, bytes: buffer.length },
      { status: 201 }
    );
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Upload failed";
    return Response.json({ error: msg }, { status: 500 });
  }
}
