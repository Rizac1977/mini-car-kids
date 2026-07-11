import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/app-shell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { currency } from "@/lib/mock-data";
import { Download, Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";

type RentalRow = {
  id: string;
  amount: number;
  planned_minutes: number;
  started_at: string;
  ended_at: string | null;
  vehicle_id: string;
  vehicles: { name: string } | null;
};

export const Route = createFileRoute("/app/relatorios")({
  head: () => ({
    meta: [
      { title: "Relatórios — MiniCar Gestão" },
      { name: "description", content: "Analise faturamento, tempo médio e desempenho por veículo." },
    ],
  }),
  component: RelatoriosPage,
});

const DIAS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

function startOfDay(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function RelatoriosPage() {
  const { user } = useAuth();

  const { data: rows = [], isLoading } = useQuery({
    queryKey: ["reports", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const from = new Date();
      from.setDate(from.getDate() - 365);
      const { data, error } = await supabase
        .from("rentals")
        .select("id,amount,planned_minutes,started_at,ended_at,vehicle_id,vehicles(name)")
        .eq("user_id", user!.id)
        .eq("status", "finalizada")
        .gte("started_at", from.toISOString())
        .order("started_at", { ascending: false });
      if (error) throw error;
      return data as unknown as RentalRow[];
    },
  });

  const metrics = useMemo(() => {
    const now = new Date();
    const today = startOfDay(now);
    const weekAgo = new Date(today); weekAgo.setDate(weekAgo.getDate() - 7);
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const prevMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const yearStart = new Date(now.getFullYear(), 0, 1);

    let dayRev = 0, weekRev = 0, monthRev = 0, yearRev = 0, prevMonthRev = 0;
    let monthCount = 0, prevMonthCount = 0;
    let totalMinutes = 0;

    const days7: number[] = Array(7).fill(0);
    const dayLabels: string[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(today); d.setDate(d.getDate() - i);
      dayLabels.push(DIAS[d.getDay()]);
    }
    const dowRev = Array(7).fill(0);
    const hourRev = Array(24).fill(0);
    const byVehicle = new Map<string, { name: string; revenue: number; count: number }>();

    for (const r of rows) {
      const started = new Date(r.started_at);
      const amt = Number(r.amount);
      const mins = Number(r.planned_minutes ?? 0);
      totalMinutes += mins;

      if (started >= today) dayRev += amt;
      if (started >= weekAgo) weekRev += amt;
      if (started >= monthStart) { monthRev += amt; monthCount++; }
      else if (started >= prevMonthStart && started < monthStart) { prevMonthRev += amt; prevMonthCount++; }
      if (started >= yearStart) yearRev += amt;

      const daysAgo = Math.floor((today.getTime() - startOfDay(started).getTime()) / 86400000);
      if (daysAgo >= 0 && daysAgo < 7) days7[6 - daysAgo] += amt;

      dowRev[started.getDay()] += amt;
      hourRev[started.getHours()] += amt;

      const key = r.vehicle_id;
      const entry = byVehicle.get(key) ?? { name: r.vehicles?.name ?? "Veículo", revenue: 0, count: 0 };
      entry.revenue += amt;
      entry.count += 1;
      byVehicle.set(key, entry);
    }

    const topVehicles = [...byVehicle.values()].sort((a, b) => b.revenue - a.revenue).slice(0, 5);
    const maxTopRev = topVehicles[0]?.revenue ?? 0;
    const maxDay7 = Math.max(1, ...days7);
    const bestDow = dowRev.indexOf(Math.max(...dowRev));
    const bestHour = hourRev.indexOf(Math.max(...hourRev));

    const avgTicket = rows.length ? rows.reduce((s, r) => s + Number(r.amount), 0) / rows.length : 0;
    const avgTime = rows.length ? totalMinutes / rows.length : 0;
    const monthDelta = prevMonthRev > 0 ? ((monthRev - prevMonthRev) / prevMonthRev) * 100 : null;

    return {
      dayRev, weekRev, monthRev, yearRev, prevMonthRev,
      monthCount, prevMonthCount, monthDelta,
      totalMinutes, avgTicket, avgTime,
      days7, dayLabels, maxDay7,
      topVehicles, maxTopRev,
      bestDow: rows.length ? DIAS[bestDow] : "—",
      bestHour: rows.length ? `${String(bestHour).padStart(2, "0")}h` : "—",
      total: rows.length,
    };
  }, [rows]);

  function exportCSV() {
    const header = ["Data", "Veículo", "Minutos", "Valor"];
    const lines = rows.map((r) => [
      new Date(r.started_at).toLocaleString("pt-BR"),
      (r.vehicles?.name ?? "").replaceAll(";", ","),
      r.planned_minutes ?? 0,
      Number(r.amount).toFixed(2).replace(".", ","),
    ].join(";"));
    const csv = [header.join(";"), ...lines].join("\n");
    const blob = new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `relatorio_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  if (isLoading) {
    return (
      <AppShell title="Relatórios">
        <div className="grid place-items-center py-20"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
      </AppShell>
    );
  }

  return (
    <AppShell title="Relatórios">
      <div className="space-y-5">
        <div className="grid grid-cols-2 gap-3">
          <Card className="p-4">
            <div className="text-xs text-muted-foreground">Faturamento hoje</div>
            <div className="text-xl font-bold text-primary">{currency(metrics.dayRev)}</div>
          </Card>
          <Card className="p-4">
            <div className="text-xs text-muted-foreground">Faturamento semana</div>
            <div className="text-xl font-bold">{currency(metrics.weekRev)}</div>
          </Card>
          <Card className="p-4">
            <div className="text-xs text-muted-foreground">Faturamento mês</div>
            <div className="text-xl font-bold text-primary">{currency(metrics.monthRev)}</div>
            {metrics.monthDelta !== null && (
              <div className={`text-xs mt-1 ${metrics.monthDelta >= 0 ? "text-success" : "text-destructive"}`}>
                {metrics.monthDelta >= 0 ? "+" : ""}{metrics.monthDelta.toFixed(0)}% vs mês anterior
              </div>
            )}
          </Card>
          <Card className="p-4">
            <div className="text-xs text-muted-foreground">Faturamento ano</div>
            <div className="text-xl font-bold">{currency(metrics.yearRev)}</div>
          </Card>
          <Card className="p-4">
            <div className="text-xs text-muted-foreground">Ticket médio</div>
            <div className="text-xl font-bold">{currency(metrics.avgTicket)}</div>
          </Card>
          <Card className="p-4">
            <div className="text-xs text-muted-foreground">Tempo médio</div>
            <div className="text-xl font-bold">{Math.round(metrics.avgTime)} min</div>
          </Card>
        </div>

        <Card className="p-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-bold text-sm">Faturamento por dia</h2>
            <span className="text-xs text-muted-foreground">Últimos 7 dias</span>
          </div>
          {metrics.days7.every((v) => v === 0) ? (
            <div className="text-sm text-muted-foreground text-center py-8">Sem locações no período.</div>
          ) : (
            <div className="flex items-end gap-2 h-32">
              {metrics.days7.map((v, i) => (
                <div key={i} className="flex-1 flex flex-col items-center gap-1">
                  <div
                    className="w-full rounded-t-md bg-primary transition-all"
                    style={{ height: `${Math.max(4, (v / metrics.maxDay7) * 100)}%` }}
                    title={currency(v)}
                  />
                  <span className="text-[10px] text-muted-foreground">{metrics.dayLabels[i]}</span>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card className="p-4">
          <h2 className="font-bold text-sm mb-3">Top veículos</h2>
          {metrics.topVehicles.length === 0 ? (
            <div className="text-sm text-muted-foreground text-center py-4">Nenhum dado.</div>
          ) : (
            <div className="space-y-3">
              {metrics.topVehicles.map((v) => (
                <div key={v.name}>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="font-medium truncate pr-2">{v.name}</span>
                    <span className="font-semibold whitespace-nowrap">{currency(v.revenue)} · {v.count}x</span>
                  </div>
                  <div className="h-2 rounded-full bg-muted overflow-hidden">
                    <div
                      className="h-full bg-primary rounded-full"
                      style={{ width: `${(v.revenue / Math.max(1, metrics.maxTopRev)) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        <div className="grid grid-cols-2 gap-3">
          <Card className="p-4">
            <div className="text-xs text-muted-foreground">Dia mais movimentado</div>
            <div className="text-lg font-bold">{metrics.bestDow}</div>
          </Card>
          <Card className="p-4">
            <div className="text-xs text-muted-foreground">Horário de pico</div>
            <div className="text-lg font-bold">{metrics.bestHour}</div>
          </Card>
          <Card className="p-4">
            <div className="text-xs text-muted-foreground">Total locações (ano)</div>
            <div className="text-lg font-bold">{metrics.total}</div>
          </Card>
          <Card className="p-4">
            <div className="text-xs text-muted-foreground">Minutos alugados</div>
            <div className="text-lg font-bold">{metrics.totalMinutes}</div>
          </Card>
        </div>

        <Button variant="outline" className="w-full h-12 gap-2" onClick={exportCSV} disabled={rows.length === 0}>
          <Download className="h-4 w-4" /> Exportar CSV
        </Button>
      </div>
    </AppShell>
  );
}
