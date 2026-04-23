/**
 * Optional: poll HeyGen for render-completion as a backup to the webhook.
 * The webhook is authoritative, but webhooks can miss due to transient errors.
 * This worker scans RENDERING videos older than 2 min and re-checks HeyGen.
 *
 * Start with:  npm run worker:metrics
 */
import "dotenv/config";
import { prisma } from "@/lib/db";
import { getVideoStatus, downloadVideo } from "@/lib/heygen";
import { keyForVideo, uploadBuffer } from "@/lib/r2";
import { log } from "@/lib/logger";

const INTERVAL_MS = 60_000;

async function tick() {
  const stale = await prisma.video.findMany({
    where: {
      status: "RENDERING",
      updatedAt: { lt: new Date(Date.now() - 2 * 60 * 1000) },
      heygenJobId: { not: null },
    },
    take: 20,
  });

  for (const v of stale) {
    if (!v.heygenJobId) continue;
    try {
      const s = await getVideoStatus(v.heygenJobId);
      if (s.data.status === "completed" && s.data.video_url) {
        const buf = await downloadVideo(s.data.video_url);
        const key = keyForVideo(v.userId, v.id);
        const url = await uploadBuffer(key, buf, "video/mp4");
        await prisma.video.update({
          where: { id: v.id },
          data: {
            status: "READY",
            r2Key: key,
            r2Url: url,
            thumbnailUrl: s.data.thumbnail_url ?? null,
            durationSec: s.data.duration ? Math.round(s.data.duration) : v.durationSec,
          },
        });
        log.info("video recovered from stale", { videoId: v.id });
      } else if (s.data.status === "failed") {
        await prisma.video.update({
          where: { id: v.id },
          data: {
            status: "FAILED",
            errorMessage: s.data.error?.detail ?? s.data.error?.message ?? "heygen failed",
          },
        });
      }
    } catch (e) {
      log.warn("stale check failed", { videoId: v.id, error: String(e) });
    }
  }
}

async function main() {
  log.info("metrics/heygen poll worker up");
  while (true) {
    try {
      await tick();
    } catch (e) {
      log.error("tick error", { error: String(e) });
    }
    await new Promise((r) => setTimeout(r, INTERVAL_MS));
  }
}

main();
