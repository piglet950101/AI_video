import Link from "next/link";
import type { ReactNode } from "react";
import { requireUser } from "@/lib/session";

const NAV = [
  { href: "/dashboard", label: "Visão Geral" },
  { href: "/scripts", label: "Roteiros" },
  { href: "/videos", label: "Vídeos" },
  { href: "/approvals", label: "Aprovações" },
  { href: "/analytics", label: "Analytics" },
  { href: "/portfolio", label: "Portfólio" },
  { href: "/settings", label: "Configurações" },
];

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  const { email } = await requireUser();
  return (
    <div className="min-h-screen grid grid-cols-[240px_1fr]">
      <aside className="border-r border-white/5 p-4 flex flex-col gap-1">
        <div className="px-2 py-3 font-semibold text-lg">Erro Zero</div>
        <div className="px-2 pb-4 text-xs text-[color:var(--muted)]">{email}</div>
        {NAV.map((n) => (
          <Link key={n.href} href={n.href} className="px-3 py-2 rounded-lg hover:bg-white/5 text-sm">
            {n.label}
          </Link>
        ))}
      </aside>
      <main className="p-6">{children}</main>
    </div>
  );
}
