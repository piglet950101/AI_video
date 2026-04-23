import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/session";

const body = z.object({ reason: z.string().optional() });

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const { email } = await requireUser();
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) return NextResponse.json({ error: "user_not_found" }, { status: 404 });

  const parsed = body.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_body", issues: parsed.error.flatten() }, { status: 400 });
  }

  const post = await prisma.post.findFirst({
    where: { id: params.id, userId: user.id, status: "PENDING_APPROVAL" },
  });
  if (!post) return NextResponse.json({ error: "post_not_pending" }, { status: 404 });

  const updated = await prisma.post.update({
    where: { id: post.id },
    data: { status: "DRAFT", rejectReason: parsed.data.reason ?? null },
  });
  return NextResponse.json({ post: updated });
}
