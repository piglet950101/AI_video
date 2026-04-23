"use client";

import { useState, useTransition } from "react";
import type { Script, Video } from "@prisma/client";

type Props = {
  script: Script & { videos: Video[] };
};

export function ScriptCard({ script }: Props) {
  const [isPending, startTransition] = useTransition();
  const [isRendering, setRendering] = useState(false);
  const variants = (script.llmVariants ?? null) as null | Record<
    string,
    { hook: string; caption: string; hashtags: string[]; cta: string }
  >;

  async function regenerate() {
    startTransition(async () => {
      const res = await fetch(`/api/scripts/${script.id}/variants`, { method: "POST" });
      if (res.ok) location.reload();
      else alert("Falha ao gerar variações. Tente novamente.");
    });
  }

  async function render(platform: "INSTAGRAM_REEL" | "INSTAGRAM_FEED" | "FACEBOOK") {
    setRendering(true);
    const aspect = platform === "FACEBOOK" ? "16:9" : "9:16";
    const res = await fetch("/api/videos/render", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ scriptId: script.id, platform, aspect }),
    });
    setRendering(false);
    if (res.ok) {
      alert("Renderização iniciada. Acompanhe em Vídeos.");
      location.reload();
    } else {
      const data = await res.json().catch(() => ({}));
      alert(`Erro: ${data.error ?? "desconhecido"}`);
    }
  }

  return (
    <div className="panel p-5">
      <div className="flex items-start justify-between">
        <div>
          <div className="text-xs uppercase tracking-wide text-[color:var(--muted)]">
            #{script.slot} · {script.format}
          </div>
          <h3 className="text-lg font-semibold mt-1">{script.titleHook}</h3>
        </div>
        <div className="flex gap-2">
          <button className="btn btn-ghost" onClick={regenerate} disabled={isPending}>
            {isPending ? "Gerando..." : variants ? "Regenerar variações" : "Gerar variações"}
          </button>
        </div>
      </div>

      <p className="text-sm text-[color:var(--muted)] mt-3 whitespace-pre-wrap">
        {script.body.slice(0, 280)}
        {script.body.length > 280 ? "..." : ""}
      </p>

      {variants ? (
        <div className="mt-4 grid lg:grid-cols-3 gap-3">
          {(["INSTAGRAM_REEL", "INSTAGRAM_FEED", "FACEBOOK"] as const).map((p) => {
            const v = variants[p];
            if (!v) return null;
            return (
              <div key={p} className="rounded-lg bg-white/5 border border-white/10 p-3">
                <div className="text-xs uppercase tracking-wide text-brand-400">{p.replace("_", " ")}</div>
                <div className="font-medium mt-1">{v.hook}</div>
                <div className="text-xs text-[color:var(--muted)] mt-2 line-clamp-4">{v.caption}</div>
                <div className="text-[10px] text-brand-300 mt-2">
                  {v.hashtags.slice(0, 5).join(" ")}
                </div>
                <button
                  className="btn btn-primary mt-3 w-full"
                  onClick={() => render(p)}
                  disabled={isRendering}
                >
                  {isRendering ? "Enviando..." : "Renderizar"}
                </button>
              </div>
            );
          })}
        </div>
      ) : (
        <p className="text-sm text-[color:var(--muted)] mt-4">
          Clique em "Gerar variações" para criar versões por plataforma.
        </p>
      )}
    </div>
  );
}
