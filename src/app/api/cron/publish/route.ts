import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { publishQueue } from "@/lib/redis";
import { env } from "@/lib/env";
import { isValidCronRequest } from "@/lib/utils";
import { log } from "@/lib/logger";

/**
 * Picks SCHEDULED posts due within the last 5 min, enqueues Meta publish jobs.
 * The BullMQ worker (src/workers/publish.ts) drains the queue and calls Meta Graph.
 */
export async function GET(req: NextRequest) {
  if (!isValidCronRequest(req, env.CRON_SECRET)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const dueSince = new Date(Date.now() - 10 * 60 * 1000);
  const dueUntil = new Date(Date.now() + 1 * 60 * 1000);

  const due = await prisma.post.findMany({
    where: {
      status: "SCHEDULED",
      scheduledAt: { gte: dueSince, lte: dueUntil },
    },
    orderBy: { scheduledAt: "asc" },
    take: 20, // defensive cap below IG's 25 posts/24h
  });

  for (const post of due) {
    await prisma.post.update({ where: { id: post.id }, data: { status: "PUBLISHING" } });
    await publishQueue.add(
      "publish-post",
      { postId: post.id },
      {
        attempts: 3,
        backoff: { type: "exponential", delay: 30_000 },
        removeOnComplete: 500,
        removeOnFail: 500,
      },
    );
  }

  log.info("cron publish tick", { enqueued: due.length });
  return NextResponse.json({ ok: true, enqueued: due.length });
}
