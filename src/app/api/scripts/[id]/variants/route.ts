import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { generateVariants } from "@/lib/claude";
import { requireUser } from "@/lib/session";
import { buildGoLink } from "@/lib/utils";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const { email } = await requireUser();
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) return NextResponse.json({ error: "user_not_found" }, { status: 404 });

  const script = await prisma.script.findFirst({
    where: { id: params.id, userId: user.id },
  });
  if (!script) return NextResponse.json({ error: "script_not_found" }, { status: 404 });

  // Placeholder postId for the ctaLink (per-video link injected at post creation).
  const ctaLink = `${process.env.NEXT_PUBLIC_APP_URL}/go/SCRIPT_${script.slot}`;

  const variants = await generateVariants({
    title: script.titleHook,
    body: script.body,
    cta: script.cta,
    ctaLink,
  });

  await prisma.script.update({
    where: { id: script.id },
    data: { llmVariants: variants },
  });

  return NextResponse.json({ variants });
}
