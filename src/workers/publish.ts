/**
 * BullMQ worker — picks publish-post jobs from the queue and calls Meta Graph.
 *
 * Runs as a separate long-lived process. Start locally with:
 *   npm run worker:publish
 *
 * In production, run on Railway/Render/Fly as a worker service. Vercel serverless
 * can't keep a BullMQ Worker alive — the cron endpoints only ENQUEUE.
 */
import "dotenv/config";
import { Worker } from "bullmq";
import { prisma } from "@/lib/db";
import { redis, QUEUES } from "@/lib/redis";
import { loadUserMetaToken, publishIgReel, publishFbVideo } from "@/lib/meta";
import { log } from "@/lib/logger";

async function processPost(postId: string) {
  const post = await prisma.post.findUnique({
    where: { id: postId },
    include: { video: true, user: true },
  });
  if (!post) throw new Error(`post ${postId} not found`);
  if (!post.video?.r2Url) throw new Error(`post ${postId} has no video URL`);

  const token = await loadUserMetaToken(post.userId);
  if (!token) throw new Error(`user ${post.userId} has no meta token`);

  const fullCaption = [post.caption, post.ctaLink ?? "", post.hashtags.join(" ")]
    .filter(Boolean)
    .join("\n\n");

  let externalId: string;
  if (post.network === "INSTAGRAM") {
    if (!post.user.igBusinessId) throw new Error("IG business id missing");
    externalId = await publishIgReel({
      igBusinessId: post.user.igBusinessId,
      videoUrl: post.video.r2Url,
      caption: fullCaption,
      pageAccessToken: token,
      shareToFeed: post.mediaType === "REEL",
    });
  } else {
    if (!post.user.metaPageId) throw new Error("FB page id missing");
    externalId = await publishFbVideo({
      pageId: post.user.metaPageId,
      pageAccessToken: token,
      videoUrl: post.video.r2Url,
      description: fullCaption,
    });
  }

  await prisma.post.update({
    where: { id: post.id },
    data: { status: "PUBLISHED", publishedAt: new Date(), externalId },
  });
  log.info("post published", { postId, externalId, network: post.network });
}

const worker = new Worker(
  QUEUES.PUBLISH,
  async (job) => {
    const { postId } = job.data as { postId: string };
    log.info("publish job start", { postId, attempt: job.attemptsMade + 1 });
    await processPost(postId);
  },
  {
    connection: redis,
    concurrency: 2, // stay well under Meta's 200/hour/user
  },
);

worker.on("completed", (job) => {
  log.info("publish job done", { id: job.id });
});

worker.on("failed", async (job, err) => {
  log.error("publish job failed", {
    id: job?.id,
    error: String(err),
    attempts: job?.attemptsMade,
  });
  const postId = (job?.data as { postId?: string })?.postId;
  // If this was the final attempt, flip the post to FAILED.
  if (postId && job && job.attemptsMade >= (job.opts.attempts ?? 3)) {
    await prisma.post.update({
      where: { id: postId },
      data: { status: "FAILED", publishError: String(err) },
    });
  }
});

log.info("publish worker up", { queue: QUEUES.PUBLISH });
