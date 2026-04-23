import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { sha256Hex } from "@/lib/encryption";
import { buildUtmUrl } from "@/lib/utils";

const DEFAULT_TARGET = "https://errozero.online";

/**
 * Public redirect. /go/[postId] logs the click and 302s to errozero.online
 * with UTM tags. No auth — anyone with the link can hit this.
 */
export async function GET(req: NextRequest, { params }: { params: { postId: string } }) {
  const post = await prisma.post.findUnique({
    where: { id: params.postId },
    select: { id: true, userId: true, network: true, mediaType: true },
  });

  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    req.headers.get("x-real-ip") ??
    "";
  const ipHash = ip ? sha256Hex(ip) : null;

  if (post) {
    // Fire-and-forget — a DB error must not block the redirect.
    prisma.clickEvent
      .create({
        data: {
          postId: post.id,
          userId: post.userId,
          userAgent: req.headers.get("user-agent")?.slice(0, 500) ?? null,
          referer: req.headers.get("referer")?.slice(0, 500) ?? null,
          ipHash,
        },
      })
      .catch(() => {});
  }

  const network = post?.network?.toLowerCase() ?? "direct";
  const medium =
    post?.mediaType === "REEL" ? "reel" : post?.mediaType === "CAROUSEL" ? "carousel" : "feed";
  const target = buildUtmUrl(DEFAULT_TARGET, network, medium, "clone", params.postId);
  return NextResponse.redirect(target, 302);
}
