import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/session";
import { buildGoLink, nextScheduledSlot } from "@/lib/utils";

const body = z.object({
  videoId: z.string().cuid(),
  network: z.enum(["INSTAGRAM", "FACEBOOK"]),
  mediaType: z.enum(["REEL", "FEED_VIDEO", "CAROUSEL"]),
  caption: z.string().min(1),
  hashtags: z.array(z.string()).default([]),
  scheduledAt: z.string().datetime().optional(),
});

/**
 * Create a Post in PENDING_APPROVAL status. The approval dashboard will flip it to
 * SCHEDULED after human review; the cron publisher picks it up from there.
 */
export async function POST(req: NextRequest) {
  const { email } = await requireUser();
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) return NextResponse.json({ error: "user_not_found" }, { status: 404 });

  const parsed = body.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_body", issues: parsed.error.flatten() }, { status: 400 });
  }
  const data = parsed.data;

  const video = await prisma.video.findFirst({
    where: { id: data.videoId, userId: user.id, status: "READY" },
  });
  if (!video) {
    return NextResponse.json({ error: "video_not_ready" }, { status: 400 });
  }

  const hours =
    (data.network === "INSTAGRAM"
      ? (user.preferredHoursIG as number[] | null)
      : (user.preferredHoursFB as number[] | null)) ?? [19];

  const scheduled = data.scheduledAt ? new Date(data.scheduledAt) : nextScheduledSlot(hours);

  const post = await prisma.post.create({
    data: {
      userId: user.id,
      videoId: video.id,
      network: data.network,
      mediaType: data.mediaType,
      caption: data.caption,
      hashtags: data.hashtags,
      scheduledAt: scheduled,
      status: "PENDING_APPROVAL",
    },
  });

  // Now we have a postId; attach the go-link permanently.
  await prisma.post.update({
    where: { id: post.id },
    data: { ctaLink: buildGoLink(post.id) },
  });

  return NextResponse.json({ postId: post.id });
}
