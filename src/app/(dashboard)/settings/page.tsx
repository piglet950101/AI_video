import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/session";

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: { meta_connected?: string; meta_error?: string };
}) {
  const { email } = await requireUser();
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) return <div>Usuário não encontrado.</div>;

  const connected = !!user.metaPageId;

  return (
    <div className="space-y-6 max-w-3xl">
      <h1 className="text-2xl font-semibold">Configurações</h1>

      {searchParams.meta_connected && (
        <div className="panel p-4 border-green-500/30 bg-green-500/10 text-green-200 text-sm">
          Conexão com Meta concluída.
        </div>
      )}
      {searchParams.meta_error && (
        <div className="panel p-4 border-red-500/30 bg-red-500/10 text-red-200 text-sm">
          Erro na conexão com Meta: {searchParams.meta_error}
        </div>
      )}

      <div className="panel p-5 space-y-3">
        <h2 className="font-semibold">Instagram + Facebook</h2>
        {connected ? (
          <>
            <p className="text-sm">
              Conectado à página <strong>{user.metaPageName}</strong>
              {user.igUsername ? ` e Instagram @${user.igUsername}` : ""}.
            </p>
            <p className="text-xs text-[color:var(--muted)]">
              Token expira em: {user.metaTokenExpiresAt?.toLocaleDateString("pt-BR") ?? "—"}
            </p>
            <a className="btn btn-ghost" href="/api/meta/oauth/start">
              Reconectar
            </a>
          </>
        ) : (
          <>
            <p className="text-sm">
              O login acontece no seu dispositivo, com sua conta. Nunca compartilhamos ou
              acessamos suas credenciais.
            </p>
            <a className="btn btn-primary" href="/api/meta/oauth/start">
              Conectar Instagram + Facebook
            </a>
            <p className="text-xs text-[color:var(--muted)]">
              Pré-requisitos: conta do Instagram como Business ou Creator, vinculada à
              Página do Facebook.
            </p>
          </>
        )}
      </div>

      <div className="panel p-5 space-y-2">
        <h2 className="font-semibold">Avatar HeyGen</h2>
        <p className="text-xs text-[color:var(--muted)]">
          A conta HeyGen é operada por Yasmin. Esta tela mostra apenas os identificadores
          vinculados ao seu avatar treinado.
        </p>
        <div className="text-sm">
          Avatar ID: <code className="text-brand-300">{user.heygenAvatarId ?? "não configurado"}</code>
        </div>
        <div className="text-sm">
          Voice ID: <code className="text-brand-300">{user.heygenVoiceId ?? "não configurado"}</code>
        </div>
      </div>

      <div className="panel p-5 space-y-2">
        <h2 className="font-semibold">Horários preferidos (BRT)</h2>
        <div className="text-sm">Instagram: {(user.preferredHoursIG as number[] | null)?.join(", ") ?? "—"}</div>
        <div className="text-sm">Facebook: {(user.preferredHoursFB as number[] | null)?.join(", ") ?? "—"}</div>
        <p className="text-xs text-[color:var(--muted)]">
          Serão recalibrados automaticamente a partir dos dados reais do seu canal.
        </p>
      </div>
    </div>
  );
}
