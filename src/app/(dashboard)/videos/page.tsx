import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/session";

// Always re-render on each request — videos list is mutable from background workers.
export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function VideosPage() {
  const { email } = await requireUser();
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) return <div>Usuário não encontrado.</div>;

  const videos = await prisma.video.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    include: { script: true },
  });

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Vídeos ({videos.length})</h1>
      <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
        {videos.map((v) => (
          <div key={v.id} className="panel p-4">
            <div className="aspect-[9/16] bg-black/50 rounded-lg overflow-hidden relative">
              {v.r2Url ? (
                <video controls src={v.r2Url} poster={v.thumbnailUrl ?? undefined} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full grid place-items-center text-[color:var(--muted)] text-sm">
                  {v.status === "RENDERING" ? "Renderizando..." : v.status}
                </div>
              )}
            </div>
            <div className="mt-3 text-sm">
              <div className="font-medium">#{v.script.slot} · {v.script.titleHook}</div>
              <div className="text-[color:var(--muted)] text-xs mt-1">
                {v.status} · {v.durationSec ?? "?"}s · {v.aspectRatio}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
