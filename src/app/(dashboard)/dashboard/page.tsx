import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/session";

export default async function DashboardPage() {
  const { email } = await requireUser();
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) return <div>Usuário não encontrado.</div>;

  const [scriptsCount, videosReady, pending, published, clicks] = await Promise.all([
    prisma.script.count({ where: { userId: user.id } }),
    prisma.video.count({ where: { userId: user.id, status: "READY" } }),
    prisma.post.count({ where: { userId: user.id, status: "PENDING_APPROVAL" } }),
    prisma.post.count({ where: { userId: user.id, status: "PUBLISHED" } }),
    prisma.clickEvent.count({ where: { userId: user.id } }),
  ]);

  const Stat = ({ label, value }: { label: string; value: string | number }) => (
    <div className="panel p-5">
      <div className="text-xs uppercase tracking-wide text-[color:var(--muted)]">{label}</div>
      <div className="text-3xl font-semibold mt-2">{value}</div>
    </div>
  );

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Visão Geral</h1>
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <Stat label="Roteiros" value={scriptsCount} />
        <Stat label="Vídeos prontos" value={videosReady} />
        <Stat label="Aguardam aprovação" value={pending} />
        <Stat label="Publicados" value={published} />
        <Stat label="Cliques /go/" value={clicks} />
      </div>

      <div className="panel p-5">
        <h2 className="font-semibold mb-2">Status da conexão Meta</h2>
        {user.metaPageId ? (
          <p className="text-sm">
            Conectado à página <strong>{user.metaPageName}</strong>
            {user.igUsername ? ` • IG @${user.igUsername}` : " • IG não vinculado"}
          </p>
        ) : (
          <p className="text-sm text-[color:var(--muted)]">
            Instagram/Facebook ainda não conectado. Vá em <a href="/settings" className="link">Configurações</a> para conectar.
          </p>
        )}
      </div>
    </div>
  );
}
