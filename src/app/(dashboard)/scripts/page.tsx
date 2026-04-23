import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/session";
import { ScriptCard } from "@/components/script-card";

export default async function ScriptsPage() {
  const { email } = await requireUser();
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) return <div>Usuário não encontrado.</div>;

  const scripts = await prisma.script.findMany({
    where: { userId: user.id },
    orderBy: { slot: "asc" },
    include: { videos: true },
  });

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Roteiros ({scripts.length})</h1>
      <div className="grid gap-4">
        {scripts.map((s) => (
          <ScriptCard key={s.id} script={s} />
        ))}
      </div>
    </div>
  );
}
