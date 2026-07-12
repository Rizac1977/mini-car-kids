import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { currency } from "@/lib/mock-data";

export type RevenueBucket = { label: string; total: number; count: number };

// Componente isolado para permitir lazy-load do recharts (~200kb bruto)
// somente quando o gráfico é realmente exibido no perfil do dono.
export default function RevenueBarChart({ data }: { data: RevenueBucket[] }) {
  return (
    <div className="h-56 -mx-2">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 4 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
          <XAxis
            dataKey="label"
            tick={{ fontSize: 10 }}
            interval="preserveStartEnd"
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tick={{ fontSize: 10 }}
            axisLine={false}
            tickLine={false}
            width={44}
            tickFormatter={(v) => (v >= 1000 ? `${Math.round(v / 100) / 10}k` : String(v))}
          />
          <Tooltip
            cursor={{ fill: "hsl(var(--muted) / 0.4)" }}
            contentStyle={{
              fontSize: 12,
              borderRadius: 8,
              border: "1px solid hsl(var(--border))",
              background: "hsl(var(--card))",
            }}
            labelStyle={{ fontWeight: 600 }}
            formatter={(v: number | string, _n, p) => {
              const count = (p?.payload as { count?: number } | undefined)?.count ?? 0;
              return [
                `${currency(Number(v))} · ${count} locaç${count === 1 ? "ão" : "ões"}`,
                "Faturamento",
              ];
            }}
          />
          <Bar dataKey="total" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
