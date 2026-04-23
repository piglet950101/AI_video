import { NextResponse, type NextRequest } from "next/server";
import crypto from "node:crypto";
import { prisma } from "@/lib/db";
import { downloadVideo, getVideoStatus } from "@/lib/heygen";
import { keyForVideo, uploadBuffer } from "@/lib/r2";
import { env } from "@/lib/env";
import { log } from "@/lib/logger";

/**
 * HeyGen webhook — fires when a render completes or fails.
 * We validate HMAC (if secret configured), then download → upload to R2 → flip status.
 */
export async function POST(req: NextRequest) {
  const raw = await req.text();

  // HMAC verification (HeyGen signs with the webhook secret).
  if (env.HEYGEN_WEBHOOK_SECRET) {
    const sig = req.headers.get("x-heygen-signature") ?? req.headers.get("x-signature") ?? "";
    const expected = crypto
      .createHmac("sha256", env.HEYGEN_WEBHOOK_SECRET)
      .update(raw)
      .digest("hex");
    if (
      !sig ||
      !crypto.timingSafeEqual(
        Buffer.from(sig.replace(/^sha256=/, ""), "hex"),
        Buffer.from(expected, "hex"),
      )
    ) {
      log.warn("heygen webhook signature mismatch");
      return NextResponse.json({ error: "bad_signature" }, { status: 401 });
    }
  }

  let payload: { event_type?: string; event_data?: { video_id?: string; url?: string } };
  try {
    payload = JSON.parse(raw);
  } catch {
    return NextResponse.json({ error: "bad_json" }, { status: 400 });
  }

  const heygenJobId = payload.event_data?.video_id;
  if (!heygenJobId) {
    return NextResponse.json({ error: "missing_video_id" }, { status: 400 });
  }

  const video = await prisma.video.findFirst({ where: { heygenJobId } });
  if (!video) {
    log.warn("heygen webhook for unknown job", { heygenJobId });
    return NextResponse.json({ ok: true, note: "unknown_job" });
  }

  if (payload.event_type === "avatar_video.fail") {
    await prisma.video.update({
      where: { id: video.id },
      data: { status: "FAILED", errorMessage: "HeyGen reported failure" },
    });
    return NextResponse.json({ ok: true });
  }

  // Re-fetch authoritative status from HeyGen — do not trust webhook alone.
  const status = await getVideoStatus(heygenJobId);
  if (status.data.status !== "completed" || !status.data.video_url) {
    log.warn("heygen webhook arrived but status not completed", {
      videoId: video.id,
      status: status.data.status,
    });
    return NextResponse.json({ ok: true });
  }

  try {
    const buf = await downloadVideo(status.data.video_url);
    const key = keyForVideo(video.userId, video.id);
    const url = await uploadBuffer(key, buf, "video/mp4");
    await prisma.video.update({
      where: { id: video.id },
      data: {
        status: "READY",
        r2Key: key,
        r2Url: url,
        thumbnailUrl: status.data.thumbnail_url ?? null,
        durationSec: status.data.duration
          ? Math.round(status.data.duration)
          : video.durationSec,
      },
    });
    log.info("video ready", { videoId: video.id, url });
    return NextResponse.json({ ok: true });
  } catch (e) {
    await prisma.video.update({
      where: { id: video.id },
      data: { status: "FAILED", errorMessage: `R2 upload failed: ${String(e)}` },
    });
    return NextResponse.json({ error: "upload_failed" }, { status: 500 });
  }
}

