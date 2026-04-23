import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/session";

export default async function PortfolioPage() {
  const { email } = await requireUser();
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) return <div>Usuário não encontrado.</div>;

  const images = await prisma.portfolioImage.findMany({
    where: { userId: user.id },
    orderBy: { order: "asc" },
  });

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Portfólio ({images.length})</h1>
      <p className="text-sm text-[color:var(--muted)]">
        As imagens serão usadas para montar carrosséis no Instagram. Ordene arrastando
        (implementação completa na próxima iteração).
      </p>
      <div className="grid md:grid-cols-3 xl:grid-cols-4 gap-3">
        {images.map((img) => (
          <div key={img.id} className="panel p-3">
            <div className="aspect-square bg-black/30 rounded overflow-hidden">
              <img src={img.r2Url} alt={img.caption ?? ""} className="w-full h-full object-cover" />
            </div>
            <div className="text-xs mt-2 truncate">{img.projectName ?? "—"}</div>
          </div>
        ))}
        {images.length === 0 && (
          <div className="col-span-full panel p-6 text-sm text-[color:var(--muted)]">
            Nenhuma imagem carregada ainda. Upload automático via drag-and-drop entra no Dia 12.
          </div>
        )}
      </div>
    </div>
  );
}
