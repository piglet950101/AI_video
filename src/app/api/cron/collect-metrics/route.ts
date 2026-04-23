import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { env } from "@/lib/env";
import { isValidCronRequest } from "@/lib/utils";
import { fetchIgInsights, fetchFbVideoInsights, loadUserMetaToken } from "@/lib/meta";
import { log } from "@/lib/logger";

const LOOKBACK_DAYS = 30;

export async function GET(req: NextRequest) {
  if (!isValidCronRequest(req, env.CRON_SECRET)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const cutoff = new Date(Date.now() - LOOKBACK_DAYS * 24 * 3600 * 1000);
  const posts = await prisma.post.findMany({
    where: {
      status: "PUBLISHED",
      publishedAt: { gte: cutoff },
      externalId: { not: null },
    },
    include: { user: true },
  });

  let ok = 0;
  let failed = 0;

  for (const post of posts) {
    const token = await loadUserMetaToken(post.userId);
    if (!token || !post.externalId) continue;

    try {
      if (post.network === "INSTAGRAM") {
        const ig = await fetchIgInsights(post.externalId, token);
        await prisma.postMetric.create({
          data: {
            postId: post.id,
            impressions: ig.impressions ?? 0,
            reach: ig.reach ?? 0,
            likes: ig.likes ?? 0,
            comments: ig.comments ?? 0,
            shares: ig.shares ?? 0,
            saves: ig.saved ?? 0,
            videoViews: ig.video_views ?? 0,
            watchTimeSec: ig.ig_reels_video_view_total_time ?? null,
            avgRetentionPct:
              ig.ig_reels_avg_watch_time && ig.ig_reels_video_view_total_time
                ? (ig.ig_reels_avg_watch_time / ig.ig_reels_video_view_total_time) * 100
                : null,
            totalInteractions: ig.total_interactions ?? 0,
          },
        });
      } else {
        const fb = await fetchFbVideoInsights(post.externalId, token);
        await prisma.postMetric.create({
          data: {
            postId: post.id,
            videoViews: fb.total_video_views ?? 0,
            watchTimeSec: fb.total_video_avg_time_watched ?? null,
          },
        });
      }
      ok++;
    } catch (e) {
      failed++;
      log.warn("metrics collection failed", { postId: post.id, error: String(e) });
    }
  }

  return NextResponse.json({ ok, failed, scanned: posts.length });
}
