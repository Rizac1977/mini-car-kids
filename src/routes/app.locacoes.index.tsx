import { createFileRoute, Link } from "@tanstack/react-router";
import { AppShell } from "@/components/app-shell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { currency, timeBR } from "@/lib/mock-data";
import { RefreshCw, Square, Clock, Plus, Loader2, Pause, Play } from "lucide-react";
import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

type ActiveRental = {
  id: string;
  vehicle_id: string;
  planned_minutes: number;
  amount: number;
  started_at: string;
  planned_end_at: string;
  paused_at: string | null;
  vehicles: { name: string; photo_url: string | null } | null;
};

function fmtCountdown(ms: number) {
  const s = Math.max(0, Math.ceil(ms / 1000));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${String(m).padStart(2, "0")}:${String(r).padStart(2, "0")}`;
}


export const Route = createFileRoute("/app/locacoes/")({
  head: () => ({
    meta: [
      { title: "Locações ativas — MiniCar Gestão" },
      { name: "description", content: "Acompanhe as locações em andamento e o tempo restante de cada veículo." },
    ],
  }),
  component: LocacoesPage,
});

function LocacoesPage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [, setTick] = useState(0);

  // Ticker para atualizar contagem regressiva (apenas projeção — dados reais no banco)
  useEffect(() => {
    const t = setInterval(() => setTick((n) => n + 1), 1000);
    return () => clearInterval(t);
  }, []);

  const { data: rentals = [], isLoading } = useQuery({
    queryKey: ["rentals-ativas", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("rentals")
        .select("id,vehicle_id,planned_minutes,amount,started_at,planned_end_at,vehicles(name,photo_url)")

        .eq("user_id", user!.id)
        .eq("status", "ativa")
        .order("planned_end_at");
      if (error) throw error;
      return data as unknown as ActiveRental[];
    },
    refetchInterval: 30000,
  });

  const finalize = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("rentals")
        .update({ status: "finalizada", ended_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Locação finalizada");
      qc.invalidateQueries({ queryKey: ["rentals-ativas"] });
      qc.invalidateQueries({ queryKey: ["vehicles"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const renew = useMutation({
    mutationFn: async (r: ActiveRental) => {
      const newEnd = new Date(new Date(r.planned_end_at).getTime() + r.planned_minutes * 60000);
      const { error } = await supabase
        .from("rentals")
        .update({
          planned_end_at: newEnd.toISOString(),
          planned_minutes: r.planned_minutes * 2,
          amount: Number(r.amount) * 2,
        })
        .eq("id", r.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Tempo renovado");
      qc.invalidateQueries({ queryKey: ["rentals-ativas"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <AppShell title="Locações ativas">
      <div className="mb-4">
        <Button asChild className="w-full h-12 gap-2">
          <Link to="/app/locacoes/nova"><Plus className="h-5 w-5" /> Nova locação</Link>
        </Button>
      </div>

      {isLoading ? (
        <div className="grid place-items-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
      ) : rentals.length === 0 ? (
        <Card className="p-6 text-center text-sm text-muted-foreground">
          Nenhuma locação ativa no momento.
        </Card>
      ) : (
        <div className="space-y-3">
          {rentals.map((r) => {
            const start = new Date(r.started_at).getTime();
            const end = new Date(r.planned_end_at).getTime();
            const total = (end - start) / 60000;
            const remaining = Math.max(0, (end - Date.now()) / 60000);
            const pct = Math.max(0, Math.min(100, (remaining / total) * 100));
            const urgent = remaining <= 1;
            const warning = remaining <= 2 && !urgent;
            return (
              <Card
                key={r.id}
                className={`p-4 ${
                  urgent ? "border-destructive border-2 bg-destructive/5"
                  : warning ? "border-warning border-2 bg-warning/5" : ""
                }`}
              >
                <div className="flex gap-3">
                  {r.vehicles?.photo_url ? (
                    <img src={r.vehicles.photo_url} alt={r.vehicles.name} className="h-16 w-16 rounded-xl object-cover shrink-0" />
                  ) : (
                    <div className="h-16 w-16 rounded-xl bg-muted grid place-items-center text-3xl shrink-0">🚗</div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="font-bold truncate">{r.vehicles?.name ?? "Veículo"}</div>
                    <div className="mt-0.5 text-xs text-muted-foreground flex items-center gap-1">

                      <Clock className="h-3 w-3" /> {timeBR(r.started_at)} → {timeBR(r.planned_end_at)}
                    </div>
                  </div>
                </div>

                <div className="mt-4">
                  <div className="flex justify-between items-baseline mb-1.5">
                    <span className={`text-2xl font-bold ${
                      urgent ? "text-destructive" : warning ? "text-warning-foreground" : "text-primary"
                    }`}>
                      {remaining > 0 ? `${Math.ceil(remaining)} min` : "Encerrado"}
                    </span>
                    <span className="text-sm font-semibold">{currency(Number(r.amount))}</span>
                  </div>
                  <Progress value={pct} className="h-2.5" />
                </div>

                <div className="mt-4 grid grid-cols-2 gap-2">
                  <Button
                    variant="outline"
                    className="h-11 gap-1.5"
                    disabled={renew.isPending}
                    onClick={() => renew.mutate(r)}
                  >
                    <RefreshCw className="h-4 w-4" /> Renovar
                  </Button>
                  <Button
                    className="h-11 gap-1.5"
                    variant="destructive"
                    disabled={finalize.isPending}
                    onClick={() => finalize.mutate(r.id)}
                  >
                    <Square className="h-4 w-4" /> Finalizar
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </AppShell>
  );
}