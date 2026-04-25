import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/session";
import { AnalyticsPanels } from "@/components/analytics-panels";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function AnalyticsPage() {
  const { email } = await requireUser();
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) return <div>Usuário não encontrado.</div>;

  const posts = await prisma.post.findMany({
    where: { userId: user.id, status: "PUBLISHED" },
    include: {
      metrics: { orderBy: { capturedAt: "desc" }, take: 1 },
      clickEvents: { select: { id: true } },
    },
    orderBy: { publishedAt: "desc" },
    take: 30,
  });

  const rows = posts.map((p) => {
    const m = p.metrics[0];
    return {
      id: p.id,
      network: p.network,
      mediaType: p.mediaType,
      caption: p.caption.slice(0, 80),
      publishedAt: p.publishedAt?.toISOString() ?? null,
      reach: m?.reach ?? 0,
      impressions: m?.impressions ?? 0,
      saves: m?.saves ?? 0,
      videoViews: m?.videoViews ?? 0,
      avgRetentionPct: m?.avgRetentionPct ?? null,
      clicks: p.clickEvents.length,
    };
  });

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Analytics</h1>
      <AnalyticsPanels rows={rows} />
    </div>
  );
}
