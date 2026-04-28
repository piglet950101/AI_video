import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { env } from "@/lib/env";
import { isValidCronRequest } from "@/lib/utils";
import { getVideoStatus, downloadVideo } from "@/lib/heygen";
import { keyForVideo, uploadBuffer } from "@/lib/r2";
import { log } from "@/lib/logger";

/**
 * Fallback for HeyGen's webhook. Some renders never trigger the webhook
 * (network blip, HeyGen routing issue, our endpoint timing out cold-start).
 * This cron polls HeyGen status for any video stuck in RENDERING for >2 min
 * and finishes the pipeline manually if HeyGen reports complete.
 *
 * Triggered by cron-job.org every minute (see NEXT_STEPS.md).
 *
 * Idempotent: if the webhook already finished a row, we skip it.
 */
export async function GET(req: NextRequest) {
  if (!isValidCronRequest(req, env.CRON_SECRET)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const stale = await prisma.video.findMany({
    where: {
      status: "RENDERING",
      heygenJobId: { not: null },
      updatedAt: { lt: new Date(Date.now() - 2 * 60 * 1000) },
    },
    take: 20,
    orderBy: { updatedAt: "asc" },
  });

  let completed = 0;
  let failed = 0;
  let stillProcessing = 0;

  for (const v of stale) {
    if (!v.heygenJobId) continue;
    try {
      const status = await getVideoStatus(v.heygenJobId);
      const data = status.data;

      if (data.status === "completed" && data.video_url) {
        const buf = await downloadVideo(data.video_url);
        const key = keyForVideo(v.userId, v.id);
        const url = await uploadBuffer(key, buf, "video/mp4");
        await prisma.video.update({
          where: { id: v.id },
          data: {
            status: "READY",
            r2Key: key,
            r2Url: url,
            thumbnailUrl: data.thumbnail_url ?? null,
            durationSec: data.duration ? Math.round(data.duration) : v.durationSec,
          },
        });
        completed++;
        log.info("poll-heygen: video recovered", { videoId: v.id });
      } else if (data.status === "failed") {
        await prisma.video.update({
          where: { id: v.id },
          data: {
            status: "FAILED",
            errorMessage:
              data.error?.detail ?? data.error?.message ?? "HeyGen reported failure",
          },
        });
        failed++;
        log.warn("poll-heygen: video failed", { videoId: v.id, error: data.error });
      } else {
        stillProcessing++;
      }
    } catch (e) {
      log.error("poll-heygen: status check error", {
        videoId: v.id,
        error: String(e),
      });
    }
  }

  return NextResponse.json({
    scanned: stale.length,
    completed,
    failed,
    stillProcessing,
  });
}
