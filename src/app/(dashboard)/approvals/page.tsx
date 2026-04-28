import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/session";
import { formatBRT } from "@/lib/utils";
import { ApprovalCard } from "@/components/approval-card";
import { AutoRefresh } from "@/components/auto-refresh";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function ApprovalsPage() {
  const { email } = await requireUser();
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) return <div>Usuário não encontrado.</div>;

  const posts = await prisma.post.findMany({
    where: { userId: user.id, status: "PENDING_APPROVAL" },
    orderBy: { scheduledAt: "asc" },
    include: { video: true },
  });

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold flex items-baseline gap-3">
        Aguardam aprovação ({posts.length})
        <AutoRefresh active={posts.length > 0} />
      </h1>
      {posts.length === 0 ? (
        <div className="panel p-6 text-sm text-[color:var(--muted)]">
          Nenhum post aguardando aprovação. Renderize um vídeo e crie um post primeiro.
        </div>
      ) : (
        <div className="grid gap-4">
          {posts.map((p) => (
            <ApprovalCard
              key={p.id}
              post={{
                id: p.id,
                network: p.network,
                mediaType: p.mediaType,
                caption: p.caption,
                hashtags: p.hashtags,
                scheduledAt: formatBRT(p.scheduledAt),
                videoUrl: p.video?.r2Url ?? null,
                thumbnailUrl: p.video?.thumbnailUrl ?? null,
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}
