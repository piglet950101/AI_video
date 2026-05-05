import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { env } from "@/lib/env";
import { isValidCronRequest } from "@/lib/utils";
import { loadUserMetaToken, publishIgReel, publishFbVideo } from "@/lib/meta";
import { log } from "@/lib/logger";

// IG Reels container ready typically takes 30-60s. Set Vercel function timeout
// to its max so we can wait synchronously without serverless timeout.
export const maxDuration = 60;
export const dynamic = "force-dynamic";

/**
 * Synchronous, on-demand publish for a single post. Bypasses BullMQ entirely
 * (no worker required). Used while the BullMQ worker is not yet deployed to a
 * long-running runtime (Railway/Render). For the current scale of 1-2 posts
 * per week and Vercel Hobby tier (60s max function duration), this is the
 * pragmatic publish path.
 *
 * Auth: bearer CRON_SECRET. Body: { postId: string }.
 */
export async function POST(req: NextRequest) {
  if (!isValidCronRequest(req, env.CRON_SECRET)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { postId } = (await req.json().catch(() => ({}))) as { postId?: string };
  if (!postId) return NextResponse.json({ error: "postId required" }, { status: 400 });

  const post = await prisma.post.findUnique({
    where: { id: postId },
    include: { user: true, video: true },
  });
  if (!post) return NextResponse.json({ error: "post_not_found" }, { status: 404 });
  if (!post.video?.r2Url) {
    return NextResponse.json({ error: "video_not_ready" }, { status: 400 });
  }

  const token = await loadUserMetaToken(post.userId);
  if (!token) return NextResponse.json({ error: "no_meta_token" }, { status: 400 });

  const fullCaption = [
    post.caption,
    post.hashtags.map((h) => `#${h}`).join(" "),
  ]
    .filter(Boolean)
    .join("\n\n");

  await prisma.post.update({
    where: { id: postId },
    data: { status: "PUBLISHING" },
  });

  try {
    let externalId: string;
    if (post.network === "INSTAGRAM") {
      if (!post.user.igBusinessId) {
        throw new Error("user has no igBusinessId");
      }
      externalId = await publishIgReel({
        igBusinessId: post.user.igBusinessId,
        videoUrl: post.video.r2Url,
        caption: fullCaption,
        pageAccessToken: token,
        shareToFeed: post.mediaType === "REEL",
      });
    } else {
      if (!post.user.metaPageId) throw new Error("user has no metaPageId");
      externalId = await publishFbVideo({
        pageId: post.user.metaPageId,
        pageAccessToken: token,
        videoUrl: post.video.r2Url,
        description: fullCaption,
      });
    }

    await prisma.post.update({
      where: { id: postId },
      data: {
        status: "PUBLISHED",
        publishedAt: new Date(),
        externalId,
      },
    });

    log.info("admin/publish-now: published", { postId, externalId, network: post.network });
    return NextResponse.json({ ok: true, postId, externalId, network: post.network });
  } catch (e) {
    const errStr = String(e).slice(0, 1000);
    await prisma.post.update({
      where: { id: postId },
      data: { status: "FAILED", publishError: errStr, retryCount: { increment: 1 } },
    });
    log.error("admin/publish-now: failed", { postId, error: errStr });
    return NextResponse.json({ ok: false, error: errStr }, { status: 502 });
  }
}
