"use client";

import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";

export interface Row {
  id: string;
  network: string;
  mediaType: string;
  caption: string;
  publishedAt: string | null;
  reach: number;
  impressions: number;
  saves: number;
  videoViews: number;
  avgRetentionPct: number | null;
  clicks: number;
}

export function AnalyticsPanels({ rows }: { rows: Row[] }) {
  const totalReach = rows.reduce((a, b) => a + b.reach, 0);
  const totalClicks = rows.reduce((a, b) => a + b.clicks, 0);
  const ctr = totalReach > 0 ? (totalClicks / totalReach) * 100 : 0;

  const chartData = rows.slice(0, 10).map((r, idx) => ({
    name: `#${idx + 1}`,
    reach: r.reach,
    clicks: r.clicks,
  }));

  return (
    <div className="space-y-6">
      <div className="grid md:grid-cols-4 gap-4">
        <Stat label="Posts medidos" value={rows.length} />
        <Stat label="Alcance total" value={totalReach.toLocaleString("pt-BR")} />
        <Stat label="Cliques totais" value={totalClicks.toLocaleString("pt-BR")} />
        <Stat label="CTR" value={`${ctr.toFixed(2)}%`} />
      </div>

      <div className="panel p-5">
        <h3 className="font-semibold mb-4">Alcance × Cliques (últimos 10 posts)</h3>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip contentStyle={{ background: "#172340", border: "none" }} />
              <Bar dataKey="reach" fill="#2a9cff" />
              <Bar dataKey="clicks" fill="#72c0ff" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="panel p-5 overflow-x-auto">
        <h3 className="font-semibold mb-4">Posts publicados</h3>
        <table className="w-full text-sm">
          <thead className="text-[color:var(--muted)] text-xs uppercase">
            <tr>
              <th className="text-left py-2">Rede</th>
              <th className="text-left py-2">Tipo</th>
              <th className="text-left py-2">Legenda</th>
              <th className="text-right py-2">Alcance</th>
              <th className="text-right py-2">Views</th>
              <th className="text-right py-2">Retenção</th>
              <th className="text-right py-2">Cliques</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-t border-white/5">
                <td className="py-2">{r.network}</td>
                <td className="py-2">{r.mediaType}</td>
                <td className="py-2 max-w-xs truncate">{r.caption}</td>
                <td className="py-2 text-right">{r.reach.toLocaleString("pt-BR")}</td>
                <td className="py-2 text-right">{r.videoViews.toLocaleString("pt-BR")}</td>
                <td className="py-2 text-right">
                  {r.avgRetentionPct != null ? `${r.avgRetentionPct.toFixed(1)}%` : "—"}
                </td>
                <td className="py-2 text-right">{r.clicks}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="panel p-5">
      <div className="text-xs uppercase tracking-wide text-[color:var(--muted)]">{label}</div>
      <div className="text-2xl font-semibold mt-2">{value}</div>
    </div>
  );
}
