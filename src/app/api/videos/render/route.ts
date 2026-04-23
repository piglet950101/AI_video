import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { generateVideo, estimateDurationSec } from "@/lib/heygen";
import { requireUser } from "@/lib/session";
import { env } from "@/lib/env";
import { log } from "@/lib/logger";

const body = z.object({
  scriptId: z.string().cuid(),
  platform: z.enum(["INSTAGRAM_REEL", "INSTAGRAM_FEED", "FACEBOOK"]),
  aspect: z.enum(["9:16", "1:1", "16:9"]).default("9:16"),
});

export async function POST(req: NextRequest) {
  const { email } = await requireUser();
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) return NextResponse.json({ error: "user_not_found" }, { status: 404 });
  if (!user.heygenAvatarId || !user.heygenVoiceId) {
    return NextResponse.json(
      { error: "avatar_not_configured", message: "Train avatar + clone voice first in HeyGen admin." },
      { status: 400 },
    );
  }

  const parsed = body.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_body", issues: parsed.error.flatten() }, { status: 400 });
  }

  const script = await prisma.script.findFirst({
    where: { id: parsed.data.scriptId, userId: user.id },
  });
  if (!script) return NextResponse.json({ error: "script_not_found" }, { status: 404 });

  const variants = script.llmVariants as Record<string, { caption: string; hook: string }> | null;
  const variant = variants?.[parsed.data.platform];
  if (!variant) {
    return NextResponse.json(
      { error: "variants_missing", message: "Regenerate variants before rendering." },
      { status: 400 },
    );
  }

  // Use hook + body as the spoken text — HeyGen will TTS this via the cloned voice.
  // For Phase 1 we speak the full body, not the short caption.
  const spoken = `${variant.hook}. ${script.body}`;

  // Create DB row first so the webhook can find it.
  const video = await prisma.video.create({
    data: {
      userId: user.id,
      scriptId: script.id,
      status: "RENDERING",
      aspectRatio:
        parsed.data.aspect === "9:16"
          ? "PORTRAIT_9_16"
          : parsed.data.aspect === "1:1"
            ? "SQUARE_1_1"
            : "LANDSCAPE_16_9",
      durationSec: estimateDurationSec(spoken),
    },
  });

  try {
    const heygenJobId = await generateVideo({
      avatarId: user.heygenAvatarId,
      voiceId: user.heygenVoiceId,
      text: spoken,
      aspect: parsed.data.aspect,
      callbackUrl: `${env.NEXT_PUBLIC_APP_URL}/api/heygen/webhook`,
      title: `ErroZero ${script.slot} — ${parsed.data.platform}`,
    });
    await prisma.video.update({
      where: { id: video.id },
      data: { heygenJobId },
    });
    log.info("heygen job submitted", { videoId: video.id, heygenJobId });
    return NextResponse.json({ videoId: video.id, heygenJobId });
  } catch (e) {
    await prisma.video.update({
      where: { id: video.id },
      data: { status: "FAILED", errorMessage: String(e) },
    });
    return NextResponse.json({ error: "heygen_submit_failed", message: String(e) }, { status: 502 });
  }
}
