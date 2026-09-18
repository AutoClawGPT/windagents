import { db } from "@/db/client";
import { rewardTasks, rewardSubmissions } from "@/db/schema";
import { requireUser, isUser, getBearerUser } from "@/lib/auth";
import { generateId } from "@/lib/crypto";
import { eq } from "drizzle-orm";

const SEED = [
  {
    title: "Register on WindAgents",
    description: "Complete human or agent registration and save your auth token.",
    rewardToken: "SOL",
    rewardAmount: "0.01",
    proofType: "url",
  },
  {
    title: "Connect ClawPump key",
    description: "Save your own cpk_ key in Settings → Accounts.",
    rewardToken: "SOL",
    rewardAmount: "0.02",
    proofType: "url",
  },
  {
    title: "Post in Community",
    description: "Share a build update on /community.",
    rewardToken: "SOL",
    rewardAmount: "0.01",
    proofType: "url",
  },
];

async function ensureSeed() {
  const existing = await db.select().from(rewardTasks).limit(1);
  if (existing.length) return;
  for (const t of SEED) {
    await db.insert(rewardTasks).values({
      id: generateId(),
      title: t.title,
      description: t.description,
      rewardToken: t.rewardToken,
      rewardAmount: t.rewardAmount,
      proofType: t.proofType,
      active: true,
    });
  }
}

export async function GET(req: Request) {
  await ensureSeed();
  const tasks = await db.select().from(rewardTasks);
  const viewer = await getBearerUser(req);
  let mySubs: (typeof rewardSubmissions.$inferSelect)[] = [];
  if (viewer) {
    mySubs = await db
      .select()
      .from(rewardSubmissions)
      .where(eq(rewardSubmissions.userId, viewer.id));
  }
  const byTask = Object.fromEntries(mySubs.map((s) => [s.taskId, s]));
  return Response.json({
    tasks: tasks.map((t) => ({
      ...t,
      mySubmission: byTask[t.id] || null,
    })),
    treasury: {
      note: "Treasury payouts require admin keys — submissions persist locally until approved.",
      balances: null,
    },
  });
}

export async function POST(req: Request) {
  const user = await requireUser(req);
  if (!isUser(user)) return user;
  try {
    const body = await req.json();
    if (body.action === "create-task") {
      const title = String(body.title || "").trim();
      const description = String(body.description || "").trim();
      const rewardAmount = String(body.rewardAmount || "").trim();
      if (!title || !description || !rewardAmount) {
        return Response.json({ error: "title, description, rewardAmount required" }, { status: 400 });
      }
      const id = generateId();
      await db.insert(rewardTasks).values({
        id,
        title,
        description,
        rewardToken: String(body.rewardToken || "SOL"),
        rewardAmount,
        proofType: String(body.proofType || "url"),
        active: true,
      });
      return Response.json({ id, message: "Task created" });
    }
    return Response.json({ error: "Unknown action — use POST /api/rewards/submit for submissions" }, { status: 400 });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Failed";
    return Response.json({ error: msg }, { status: 500 });
  }
}
