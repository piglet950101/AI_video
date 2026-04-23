"use client";
import { signIn } from "next-auth/react";
import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";

function LoginForm() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const params = useSearchParams();
  const justSent = params.get("check") === "1";

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    await signIn("email", { email, callbackUrl: "/dashboard", redirect: false });
    setSent(true);
  }

  if (sent || justSent) {
    return (
      <div className="text-sm bg-brand-500/10 border border-brand-500/30 rounded-lg p-4">
        Se o e-mail estiver autorizado, um link de acesso foi enviado. Verifique sua caixa de entrada.
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-3">
      <label className="block text-sm">
        <span className="text-[color:var(--muted)]">E-mail</span>
        <input
          className="input mt-1"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="voce@errozero.online"
          required
        />
      </label>
      <button type="submit" className="btn btn-primary w-full">Enviar link de acesso</button>
    </form>
  );
}

export default function LoginPage() {
  return (
    <main className="min-h-screen grid place-items-center px-4">
      <div className="panel p-8 w-full max-w-md">
        <h1 className="text-2xl font-semibold mb-2">Erro Zero</h1>
        <p className="text-[color:var(--muted)] mb-6 text-sm">Automação de vídeos com clone de IA</p>
        <Suspense fallback={<div className="text-sm text-[color:var(--muted)]">Carregando...</div>}>
          <LoginForm />
        </Suspense>
      </div>
    </main>
  );
}
