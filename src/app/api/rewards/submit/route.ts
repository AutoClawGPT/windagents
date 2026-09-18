import { db } from "@/db/client";
import { rewardSubmissions, rewardTasks } from "@/db/schema";
import { requireUser, isUser } from "@/lib/auth";
import { generateId } from "@/lib/crypto";
import { and, eq } from "drizzle-orm";

export async function POST(req: Request) {
  const user = await requireUser(req);
  if (!isUser(user)) return user;
  try {
    const body = await req.json();
    const taskId = String(body.taskId || "").trim();
    if (!taskId) return Response.json({ error: "taskId required" }, { status: 400 });
    const [task] = await db.select().from(rewardTasks).where(eq(rewardTasks.id, taskId)).limit(1);
    if (!task || !task.active) {
      return Response.json({ error: "Task not found or inactive" }, { status: 404 });
    }
    const [existing] = await db
      .select()
      .from(rewardSubmissions)
      .where(and(eq(rewardSubmissions.taskId, taskId), eq(rewardSubmissions.userId, user.id)))
      .limit(1);
    if (existing && existing.status !== "rejected") {
      return Response.json({ error: "Already submitted", submission: existing }, { status: 409 });
    }
    const id = existing?.id || generateId();
    const row = {
      id,
      taskId,
      userId: user.id,
      proofUrl: body.proofUrl ? String(body.proofUrl) : null,
      proofWallet: body.proofWallet ? String(body.proofWallet) : null,
      status: "pending" as const,
      notes: body.notes ? String(body.notes) : null,
      updatedAt: new Date().toISOString(),
    };
    if (existing) {
      await db.update(rewardSubmissions).set(row).where(eq(rewardSubmissions.id, id));
    } else {
      await db.insert(rewardSubmissions).values(row);
    }
    return Response.json({ submission: row, message: "Submission recorded (pending review)" });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Submit failed";
    return Response.json({ error: msg }, { status: 500 });
  }
}
