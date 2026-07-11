import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/app-shell";
import { Card } from "@/components/ui/card";
import { currency, dateBR, timeBR } from "@/lib/mock-data";
import { MapPin, Clock, Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";

type HistoryRow = {
  id: string;
  amount: number;
  planned_minutes: number;
  started_at: string;
  ended_at: string | null;
  vehicles: { name: string; photo_url: string | null } | null;
  locations: { name: string } | null;
};

const filters = [
  { key: "hoje", label: "Hoje" },
  { key: "ontem", label: "Ontem" },
  { key: "semana", label: "Semana" },
  { key: "mes", label: "Mês" },
  { key: "ano", label: "Ano" },
  { key: "tudo", label: "Tudo" },
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
      { name: "description", content: "Consulte todas as locações finalizadas e seus valores." },
    ],
  }),
  component: HistoricoPage,
});

function HistoricoPage() {
  const { user } = useAuth();
  const [filter, setFilter] = useState<(typeof filters)[number]["key"]>("hoje");

  const { data: rows = [], isLoading } = useQuery({
    queryKey: ["history", user?.id, filter],
    enabled: !!user,
    queryFn: async () => {
      const { from, to } = rangeFor(filter);
      let q = supabase
        .from("rentals")
        .select("id,amount,planned_minutes,started_at,ended_at,vehicles(name,photo_url),locations(name)")
        .eq("user_id", user!.id)
        .eq("status", "finalizada")
        .order("ended_at", { ascending: false });
      if (from) q = q.gte("ended_at", from.toISOString());
      if (to) q = q.lt("ended_at", to.toISOString());
      const { data, error } = await q;
      if (error) throw error;
      return data as unknown as HistoryRow[];
    },
  });

  const total = rows.reduce((s, h) => s + Number(h.amount), 0);
  const avg = rows.length ? total / rows.length : 0;

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

        <Card className="p-4 bg-primary-soft border-primary/30">
          <div className="grid grid-cols-3 gap-3 text-center">
            <div>
              <div className="text-xs text-muted-foreground">Locações</div>
              <div className="text-lg font-bold">{rows.length}</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Total</div>
              <div className="text-lg font-bold text-primary">{currency(total)}</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Ticket médio</div>
              <div className="text-lg font-bold">{currency(avg)}</div>
            </div>
          </div>
        </Card>

        {isLoading ? (
          <div className="grid place-items-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
        ) : rows.length === 0 ? (
          <Card className="p-6 text-center text-sm text-muted-foreground">Nenhuma locação encontrada no período.</Card>
        ) : (
          <div className="space-y-3">
            {rows.map((h) => {
              const when = h.ended_at ?? h.started_at;
              return (
                <Card key={h.id} className="p-4">
                  <div className="flex gap-3">
                    {h.vehicles?.photo_url ? (
                      <img src={h.vehicles.photo_url} alt={h.vehicles.name} className="h-12 w-12 rounded-xl object-cover shrink-0" />
                    ) : (
                      <div className="h-12 w-12 rounded-xl bg-muted grid place-items-center text-2xl shrink-0">🚗</div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <div className="font-semibold truncate">{h.vehicles?.name ?? "Veículo"}</div>
                          <div className="text-xs text-muted-foreground flex items-center gap-1 truncate">
                            <MapPin className="h-3 w-3" /> {h.locations?.name}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-bold text-primary">{currency(Number(h.amount))}</div>
                          <div className="text-xs text-muted-foreground flex items-center gap-1 justify-end">
                            <Clock className="h-3 w-3" /> {h.planned_minutes} min
                          </div>
                        </div>
                      </div>
                      <div className="mt-2 text-xs text-muted-foreground">
                        {dateBR(when)} · {timeBR(when)}
                      </div>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </AppShell>
  );
}
