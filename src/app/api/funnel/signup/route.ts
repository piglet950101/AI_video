import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { log } from "@/lib/logger";

/**
 * Optional webhook that errozero.online can fire when a signup completes.
 * Payload includes the utm_content (= postId) so we can close the funnel loop.
 *
 * Security: accept a shared secret in the Authorization header OR rely on
 * IP allowlisting at the edge. For Phase 1 we accept a bearer secret.
 */
const body = z.object({
  postId: z.string().optional(),
  email: z.string().email().optional(),
  utmContent: z.string().optional(),
  source: z.string().optional(),
});

export async function POST(req: NextRequest) {
  const auth = req.headers.get("authorization");
  const expected = `Bearer ${process.env.CRON_SECRET ?? ""}`;
  if (!auth || auth !== expected) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const parsed = body.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_body", issues: parsed.error.flatten() }, { status: 400 });
  }

  const postId = parsed.data.postId ?? parsed.data.utmContent;
  if (postId) {
    // Log as a special click event (postId set, userAgent = "signup_conversion")
    const post = await prisma.post.findUnique({ where: { id: postId } });
    if (post) {
      await prisma.clickEvent.create({
        data: {
          postId: post.id,
          userId: post.userId,
          userAgent: "signup_conversion",
          referer: parsed.data.source ?? "errozero.online",
        },
      });
    }
  }

  log.info("funnel signup", { postId, email: parsed.data.email });
  return NextResponse.json({ ok: true });
}
