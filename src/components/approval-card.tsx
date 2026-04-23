"use client";

import { useState } from "react";

interface Props {
  post: {
    id: string;
    network: "INSTAGRAM" | "FACEBOOK";
    mediaType: "REEL" | "FEED_VIDEO" | "CAROUSEL";
    caption: string;
    hashtags: string[];
    scheduledAt: string;
    videoUrl: string | null;
    thumbnailUrl: string | null;
  };
}

export function ApprovalCard({ post }: Props) {
  const [busy, setBusy] = useState(false);
  const [caption, setCaption] = useState(post.caption);
  const [confirm, setConfirm] = useState(false);

  async function approve() {
    setBusy(true);
    const res = await fetch(`/api/posts/${post.id}/approve`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ caption }),
    });
    setBusy(false);
    if (res.ok) location.reload();
    else alert("Falha ao aprovar.");
  }

  async function reject() {
    const reason = prompt("Motivo da rejeição (opcional):") ?? undefined;
    setBusy(true);
    const res = await fetch(`/api/posts/${post.id}/reject`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ reason }),
    });
    setBusy(false);
    if (res.ok) location.reload();
    else alert("Falha ao rejeitar.");
  }

  return (
    <div className="panel p-5 grid md:grid-cols-[200px_1fr] gap-5">
      <div className="aspect-[9/16] bg-black/50 rounded-lg overflow-hidden">
        {post.videoUrl ? (
          <video
            controls
            src={post.videoUrl}
            poster={post.thumbnailUrl ?? undefined}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full grid place-items-center text-xs text-[color:var(--muted)]">
            sem preview
          </div>
        )}
      </div>
      <div>
        <div className="flex gap-2 text-xs mb-2">
          <span className="badge bg-brand-500/20 text-brand-300">{post.network}</span>
          <span className="badge bg-white/10">{post.mediaType}</span>
          <span className="text-[color:var(--muted)]">{post.scheduledAt} BRT</span>
        </div>
        <textarea
          className="textarea"
          value={caption}
          onChange={(e) => setCaption(e.target.value)}
        />
        <div className="text-xs text-brand-300 mt-2">{post.hashtags.slice(0, 10).join(" ")}</div>
        <div className="flex gap-2 mt-4">
          {confirm ? (
            <>
              <button className="btn btn-primary" onClick={approve} disabled={busy}>
                Confirmar aprovação
              </button>
              <button className="btn btn-ghost" onClick={() => setConfirm(false)} disabled={busy}>
                Cancelar
              </button>
            </>
          ) : (
            <>
              <button className="btn btn-primary" onClick={() => setConfirm(true)} disabled={busy}>
                Aprovar
              </button>
              <button className="btn btn-danger" onClick={reject} disabled={busy}>
                Rejeitar
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
