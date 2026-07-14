import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/app-shell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { currency, dateBR, timeBR } from "@/lib/mock-data";
import { Clock, Download, Loader2, ChevronDown } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { useVehiclePhotoUrl } from "@/hooks/use-vehicle-photo";

type HistoryRow = {
  id: string;
  amount: number;
  planned_minutes: number;
  started_at: string;
  ended_at: string | null;
  status: string;
  vehicle_id: string;
  vehicles: { name: string; photo_url: string | null } | null;
};

const filters = [
  { key: "hoje", label: "Hoje" },
  { key: "ontem", label: "Ontem" },
  { key: "semana", label: "Semana" },
  { key: "mes", label: "Mês" },
  { key: "ano", label: "Ano" },
  { key: "tudo", label: "Tudo" },
  { key: "custom", label: "Personalizado" },
] as const;

const statusOptions = [
  { key: "todos", label: "Todos" },
  { key: "finalizada", label: "Finalizadas" },
  { key: "cancelada", label: "Canceladas" },
] as const;

function rangeFor(key: (typeof filters)[number]["key"]): { from: Date | null; to: Date | null } {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  if (key === "hoje") return { from: start, to: null };
  if (key === "ontem") {
    const y = new Date(start); y.setDate(y.getDate() - 1);
    return { from: y, to: start };
  }
  if (key === "semana") {
    const d = new Date(start); d.setDate(d.getDate() - 7);
    return { from: d, to: null };
  }
  if (key === "mes") return { from: new Date(now.getFullYear(), now.getMonth(), 1), to: null };
  if (key === "ano") return { from: new Date(now.getFullYear(), 0, 1), to: null };
  return { from: null, to: null };
}

export const Route = createFileRoute("/app/historico")({
  head: () => ({
    meta: [
      { title: "Histórico — MiniCar Gestão" },
      { name: "description", content: "Consulte todas as locações finalizadas e canceladas, com filtros e exportação." },
    ],
  }),
  component: HistoricoPage,
});

function HistoricoPage() {
  const { user } = useAuth();
  const [filter, setFilter] = useState<(typeof filters)[number]["key"]>("mes");
  const [statusFilter, setStatusFilter] = useState<(typeof statusOptions)[number]["key"]>("todos");
  const [vehicleFilter, setVehicleFilter] = useState<string>("todos");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");

  const { data: vehicles = [] } = useQuery({
    queryKey: ["vehicles-list", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("vehicles")
        .select("id,name")
        .eq("user_id", user!.id)
        .order("name");
      if (error) throw error;
      return data as { id: string; name: string }[];
    },
  });

  const { data: rows = [], isLoading } = useQuery({
    queryKey: ["history", user?.id, filter, statusFilter, vehicleFilter, customFrom, customTo],
    enabled: !!user,
    queryFn: async () => {
      let from: Date | null = null;
      let to: Date | null = null;
      if (filter === "custom") {
        from = customFrom ? new Date(customFrom + "T00:00:00") : null;
        to = customTo ? new Date(customTo + "T23:59:59") : null;
      } else {
        const r = rangeFor(filter);
        from = r.from; to = r.to;
      }
      let q = supabase
        .from("rentals")
        .select("id,amount,planned_minutes,started_at,ended_at,status,vehicle_id,vehicles(name,photo_url)")
        .eq("user_id", user!.id)
        .in("status", ["finalizada", "cancelada"])
        .order("ended_at", { ascending: false, nullsFirst: false });
      if (statusFilter !== "todos") q = q.eq("status", statusFilter);
      if (vehicleFilter !== "todos") q = q.eq("vehicle_id", vehicleFilter);
      if (from) q = q.gte("started_at", from.toISOString());
      if (to) q = q.lt("started_at", to.toISOString());
      const { data, error } = await q;
      if (error) throw error;
      return data as unknown as HistoryRow[];
    },
  });

  const stats = useMemo(() => {
    const finalized = rows.filter((r) => r.status === "finalizada");
    const total = finalized.reduce((s, h) => s + Number(h.amount), 0);
    const minutes = finalized.reduce((s, h) => s + Number(h.planned_minutes ?? 0), 0);
    const avg = finalized.length ? total / finalized.length : 0;
    const avgTime = finalized.length ? minutes / finalized.length : 0;
    return { total, avg, avgTime, minutes, count: finalized.length, canceled: rows.length - finalized.length };
  }, [rows]);

  function exportCSV() {
    const header = ["Data", "Hora início", "Hora fim", "Veículo", "Minutos", "Valor", "Status"];
    const lines = rows.map((r) => {
      const when = r.ended_at ?? r.started_at;
      return [
        dateBR(when),
        timeBR(r.started_at),
        r.ended_at ? timeBR(r.ended_at) : "",
        (r.vehicles?.name ?? "").replaceAll(";", ","),
        r.planned_minutes ?? 0,
        Number(r.amount).toFixed(2).replace(".", ","),
        r.status,
      ].join(";");
    });
    const csv = [header.join(";"), ...lines].join("\n");
    const blob = new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `historico_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <AppShell title="Histórico">
      <div className="space-y-4">
        <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
          {filters.map((f) => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={`shrink-0 px-4 h-9 rounded-full text-sm font-medium border ${
                filter === f.key
                  ? "bg-foreground text-background border-foreground"
                  : "bg-card text-foreground border-border"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {filter === "custom" && (
          <Card className="p-3 grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="from" className="text-xs">De</Label>
              <Input id="from" type="date" value={customFrom} onChange={(e) => setCustomFrom(e.target.value)} />
            </div>
            <div>
              <Label htmlFor="to" className="text-xs">Até</Label>
              <Input id="to" type="date" value={customTo} onChange={(e) => setCustomTo(e.target.value)} />
            </div>
          </Card>
        )}

        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label className="text-xs">Status</Label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}
              className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
            >
              {statusOptions.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}
            </select>
          </div>
          <div>
            <Label className="text-xs">Veículo</Label>
            <select
              value={vehicleFilter}
              onChange={(e) => setVehicleFilter(e.target.value)}
              className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
            >
              <option value="todos">Todos</option>
              {vehicles.map((v) => <option key={v.id} value={v.id}>{v.name}</option>)}
            </select>
          </div>
        </div>

        <Card className="p-4 bg-primary-soft border-primary/30">
          <div className="grid grid-cols-3 gap-3 text-center">
            <div>
              <div className="text-xs text-muted-foreground">Locações</div>
              <div className="text-lg font-bold">{stats.count}</div>
              {stats.canceled > 0 && (
                <div className="text-[10px] text-muted-foreground">+{stats.canceled} canc.</div>
              )}
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Total</div>
              <div className="text-lg font-bold text-primary">{currency(stats.total)}</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Ticket médio</div>
              <div className="text-lg font-bold">{currency(stats.avg)}</div>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3 text-center mt-3 pt-3 border-t border-primary/20">
            <div>
              <div className="text-xs text-muted-foreground">Tempo médio</div>
              <div className="text-sm font-semibold">{Math.round(stats.avgTime)} min</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Total minutos</div>
              <div className="text-sm font-semibold">{stats.minutes} min</div>
            </div>
          </div>
        </Card>

        <Button variant="outline" className="w-full h-11 gap-2" onClick={exportCSV} disabled={rows.length === 0}>
          <Download className="h-4 w-4" /> Exportar CSV
        </Button>

        {isLoading ? (
          <div className="grid place-items-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
        ) : rows.length === 0 ? (
          <Card className="p-6 text-center text-sm text-muted-foreground">Nenhuma locação encontrada no período.</Card>
        ) : (
          <GroupedHistory rows={rows} />
        )}
      </div>
    </AppShell>
  );
}

function HistoryPhoto({ path, name }: { path: string | null; name: string }) {
  const src = useVehiclePhotoUrl(path);
  if (src) return <img loading="lazy" decoding="async" src={src} alt={name} className="h-12 w-12 rounded-xl object-cover shrink-0" />;
  return <div className="h-12 w-12 rounded-xl bg-muted grid place-items-center text-2xl shrink-0">🚗</div>;
}

type DayGroup = {
  key: string;
  label: string;
  rows: HistoryRow[];
  total: number;
  count: number;
  canceled: number;
};

function GroupedHistory({ rows }: { rows: HistoryRow[] }) {
  const groups = useMemo<DayGroup[]>(() => {
    const map = new Map<string, DayGroup>();
    for (const r of rows) {
      const when = r.ended_at ?? r.started_at;
      const d = new Date(when);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
      let g = map.get(key);
      if (!g) {
        g = { key, label: dateBR(when), rows: [], total: 0, count: 0, canceled: 0 };
        map.set(key, g);
      }
      g.rows.push(r);
      if (r.status === "finalizada") {
        g.total += Number(r.amount);
        g.count += 1;
      } else {
        g.canceled += 1;
      }
    }
    return Array.from(map.values());
  }, [rows]);

  const [open, setOpen] = useState<Record<string, boolean>>(() => {
    // Primeiro grupo aberto por padrão
    return groups[0] ? { [groups[0].key]: true } : {};
  });

  const toggle = (k: string) => setOpen((o) => ({ ...o, [k]: !o[k] }));

  return (
    <div className="space-y-2">
      {groups.map((g, idx) => {
        const isOpen = open[g.key] ?? idx === 0;
        return (
          <Card key={g.key} className="overflow-hidden">
            <button
              type="button"
              onClick={() => toggle(g.key)}
              className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-muted/40 transition"
            >
              <ChevronDown
                className={`h-4 w-4 text-muted-foreground shrink-0 transition-transform ${isOpen ? "rotate-0" : "-rotate-90"}`}
              />
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-sm">{g.label}</div>
                <div className="text-xs text-muted-foreground">
                  {g.count} {g.count === 1 ? "locação" : "locações"}
                  {g.canceled > 0 && ` · ${g.canceled} canc.`}
                </div>
              </div>
              <div className="text-right shrink-0">
                <div className="text-sm font-bold text-primary">{currency(g.total)}</div>
              </div>
            </button>

            {isOpen && (
              <div className="border-t border-border divide-y divide-border">
                {g.rows.map((h) => {
                  const isCanceled = h.status === "cancelada";
                  return (
                    <div key={h.id} className="flex gap-3 px-4 py-3">
                      <HistoryPhoto path={h.vehicles?.photo_url ?? null} name={h.vehicles?.name ?? "Veículo"} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <div className="font-medium text-sm truncate">{h.vehicles?.name ?? "Veículo"}</div>
                            <div className="text-[11px] text-muted-foreground mt-0.5">
                              {timeBR(h.started_at)}{h.ended_at ? ` – ${timeBR(h.ended_at)}` : ""}
                            </div>
                            {isCanceled && (
                              <span className="inline-block mt-1 text-[10px] font-semibold uppercase tracking-wide text-destructive bg-destructive/10 rounded-full px-2 py-0.5">
                                Cancelada
                              </span>
                            )}
                          </div>
                          <div className="text-right shrink-0">
                            <div className={`text-sm font-bold ${isCanceled ? "text-muted-foreground line-through" : "text-primary"}`}>
                              {currency(Number(h.amount))}
                            </div>
                            <div className="text-[11px] text-muted-foreground flex items-center gap-1 justify-end">
                              <Clock className="h-3 w-3" /> {h.planned_minutes} min
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>
        );
      })}
    </div>
  );
}
