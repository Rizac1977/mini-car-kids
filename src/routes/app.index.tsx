import { createFileRoute, Link } from "@tanstack/react-router";
import { AppShell } from "@/components/app-shell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { currency } from "@/lib/mock-data";
import {
  DollarSign,
  Timer,
  Car,
  CarFront,
  Ticket,
  Clock,
  Trophy,
  AlertCircle,
  Loader2,
  History,
  BarChart3,
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { useVehiclePhotoUrl } from "@/hooks/use-vehicle-photo";

export const Route = createFileRoute("/app/")({
  head: () => ({
    meta: [
      { title: "Dashboard — MiniCar Gestão" },
      { name: "description", content: "Painel do dono com faturamento, locações e veículos em uso." },
    ],
  }),
  component: DashboardPage,
});

type RentalRow = {
  id: string;
  vehicle_id: string;
  status: string;
  amount: number;
  planned_minutes: number;
  started_at: string;
  ended_at: string | null;
  planned_end_at: string;
  paused_at: string | null;
  vehicles: { name: string; photo_url: string | null } | null;
};

function Stat({
  icon: Icon,
  label,
  value,
  tone = "default",
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  tone?: "default" | "primary" | "accent";
}) {
  const bg =
    tone === "primary"
      ? "bg-primary-soft text-primary"
      : tone === "accent"
      ? "bg-accent/20 text-accent-foreground"
      : "bg-muted text-foreground";
  return (
    <Card className="p-4">
      <div className="flex items-center gap-3">
        <div className={`h-10 w-10 rounded-xl grid place-items-center ${bg}`}>
          <Icon className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <div className="text-xs text-muted-foreground truncate">{label}</div>
          <div className="text-lg font-bold truncate">{value}</div>
        </div>
      </div>
    </Card>
  );
}

function fmtCountdown(ms: number) {
  const s = Math.max(0, Math.ceil(ms / 1000));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${String(m).padStart(2, "0")}:${String(r).padStart(2, "0")}`;
}

function DashboardPage() {
  const { user } = useAuth();
  const [, setTick] = useState(0);

  const { data: profile } = useQuery({
    queryKey: ["dashboard-profile", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("user_id", user!.id)
        .maybeSingle();
      if (error) throw error;
      return data as { full_name: string | null } | null;
    },
  });

  useEffect(() => {
    const t = setInterval(() => setTick((n) => n + 1), 1000);
    return () => clearInterval(t);
  }, []);

  const startOfDay = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d.toISOString();
  }, []);
  const startOfMonth = useMemo(() => {
    const d = new Date();
    d.setDate(1);
    d.setHours(0, 0, 0, 0);
    return d.toISOString();
  }, []);

  const { data: vehicles = [], isLoading: loadingVehicles } = useQuery({
    queryKey: ["dashboard-vehicles", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("vehicles")
        .select("id,status")
        .eq("user_id", user!.id);
      if (error) throw error;
      return data as { id: string; status: string }[];
    },
  });

  const { data: todayRentals = [], isLoading: loadingToday } = useQuery({
    queryKey: ["dashboard-today", user?.id, startOfDay],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("rentals")
        .select("id,amount,planned_minutes,started_at,ended_at,status")
        .eq("user_id", user!.id)
        .gte("started_at", startOfDay);
      if (error) throw error;
      return data as Pick<RentalRow, "id" | "amount" | "planned_minutes" | "started_at" | "ended_at" | "status">[];
    },
    refetchInterval: 30000,
  });

  const { data: activeRentals = [] } = useQuery({
    queryKey: ["dashboard-active", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("rentals")
        .select("id,vehicle_id,status,amount,planned_minutes,started_at,ended_at,planned_end_at,paused_at,vehicles(name,photo_url)")
        .eq("user_id", user!.id)
        .eq("status", "ativa")
        .order("planned_end_at")
        .limit(3);
      if (error) throw error;
      return data as unknown as RentalRow[];
    },
    refetchInterval: 30000,
  });

  const { data: topVehicle } = useQuery({
    queryKey: ["dashboard-top-vehicle", user?.id, startOfMonth],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("rentals")
        .select("vehicle_id,vehicles(name,photo_url)")
        .eq("user_id", user!.id)
        .gte("started_at", startOfMonth);
      if (error) throw error;
      const counts = new Map<string, { count: number; name: string; photo_url: string | null }>();
      for (const row of data as { vehicle_id: string; vehicles: { name: string; photo_url: string | null } | null }[]) {
        const cur = counts.get(row.vehicle_id);
        if (cur) cur.count += 1;
        else counts.set(row.vehicle_id, { count: 1, name: row.vehicles?.name ?? "Veículo", photo_url: row.vehicles?.photo_url ?? null });
      }
      let best: { count: number; name: string; photo_url: string | null } | null = null;
      for (const v of counts.values()) if (!best || v.count > best.count) best = v;
      return best;
    },
  });

  const { data: subscription } = useQuery({
    queryKey: ["dashboard-subscription", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("subscriptions")
        .select("status,current_period_end,plan")
        .eq("user_id", user!.id)
        .maybeSingle();
      if (error) throw error;
      return data as { status: string; current_period_end: string | null; plan: string } | null;
    },
  });

  const finishedToday = todayRentals.filter((r) => r.status === "finalizada");
  const revenueToday = finishedToday.reduce((s, r) => s + Number(r.amount), 0);
  const countToday = todayRentals.length;
  const ticket = finishedToday.length > 0 ? revenueToday / finishedToday.length : 0;
  const avgMinutes =
    finishedToday.length > 0
      ? Math.round(
          finishedToday.reduce((s, r) => {
            if (!r.ended_at) return s + r.planned_minutes;
            return s + (new Date(r.ended_at).getTime() - new Date(r.started_at).getTime()) / 60000;
          }, 0) / finishedToday.length,
        )
      : 0;

  const disponiveis = vehicles.filter((v) => v.status === "disponivel").length;
  const emUso = vehicles.filter((v) => v.status === "em_locacao").length;

  const daysToExpire = subscription?.current_period_end
    ? Math.ceil((new Date(subscription.current_period_end).getTime() - Date.now()) / 86400000)
    : null;

  const firstName = (profile?.full_name ?? "").split(" ")[0] || "";

  const loading = loadingVehicles || loadingToday;

  return (
    <AppShell title={firstName ? `Olá, ${firstName} 👋` : "Dashboard"}>
      <div className="space-y-6">
        {loading ? (
          <div className="grid place-items-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            <Stat icon={DollarSign} label="Faturamento hoje" value={currency(revenueToday)} tone="primary" />
            <Stat icon={Timer} label="Locações hoje" value={String(countToday)} />
            <Stat icon={Car} label="Disponíveis" value={String(disponiveis)} />
            <Stat icon={CarFront} label="Em uso" value={String(emUso)} tone="accent" />
            <Stat icon={Ticket} label="Ticket médio" value={currency(ticket)} />
            <Stat icon={Clock} label="Tempo médio" value={avgMinutes > 0 ? `${avgMinutes} min` : "—"} />
          </div>
        )}

        {topVehicle && (
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <TopVehiclePhoto path={topVehicle.photo_url} name={topVehicle.name} />
              <div className="flex-1 min-w-0">
                <div className="text-xs text-muted-foreground">Veículo mais utilizado no mês</div>
                <div className="font-bold truncate">{topVehicle.name}</div>
                <div className="text-xs text-muted-foreground">{topVehicle.count} locações</div>
              </div>
              <Trophy className="h-5 w-5 text-accent" />
            </div>
          </Card>
        )}

        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-bold">Próximas a terminar</h2>
            <Link to="/app/locacoes" className="text-sm text-primary font-medium">
              Ver todas
            </Link>
          </div>
          {activeRentals.length === 0 ? (
            <Card className="p-4 text-sm text-muted-foreground text-center">
              Nenhuma locação ativa.
            </Card>
          ) : (
            <div className="space-y-3">
              {activeRentals.map((r) => {
                const isPaused = !!r.paused_at;
                const nowRef = isPaused ? new Date(r.paused_at!).getTime() : Date.now();
                const remainingMs = Math.max(0, new Date(r.planned_end_at).getTime() - nowRef);
                const urgent = !isPaused && remainingMs <= 60_000;
                return (
                  <Card key={r.id} className="p-4">
                    <div className="flex items-center gap-3">
                      <ActiveVehiclePhoto path={r.vehicles?.photo_url ?? null} name={r.vehicles?.name ?? "Veículo"} />
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold truncate">{r.vehicles?.name ?? "Veículo"}</div>
                        <div className="text-xs text-muted-foreground">
                          {isPaused ? "Pausada" : "Em andamento"}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-xs text-muted-foreground">Restante</div>
                        <div className={`font-bold tabular-nums ${isPaused ? "text-muted-foreground" : urgent ? "text-destructive" : "text-primary"}`}>
                          {fmtCountdown(remainingMs)}
                        </div>
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </div>

        {daysToExpire !== null && daysToExpire <= 30 && (
          <Card className="p-4 border-warning/40 bg-warning/10">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-warning-foreground shrink-0 mt-0.5" />
              <div className="text-sm">
                <div className="font-semibold">
                  {daysToExpire > 0
                    ? `Sua assinatura vence em ${daysToExpire} dia${daysToExpire === 1 ? "" : "s"}`
                    : "Sua assinatura está vencida"}
                </div>
                <div className="text-muted-foreground">
                  Renove com antecedência para não interromper suas locações.
                </div>
              </div>
            </div>
          </Card>
        )}

        <Link to="/app/locacoes/nova">
          <Button className="w-full h-14 text-base font-bold">+ Iniciar nova locação</Button>
        </Link>

        <div className="grid grid-cols-2 gap-3">
          <Link to="/app/historico">
            <Card className="p-4 flex items-center gap-3 hover:bg-muted/40 transition">
              <div className="h-10 w-10 rounded-xl grid place-items-center bg-primary-soft text-primary">
                <History className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <div className="font-semibold">Histórico</div>
                <div className="text-xs text-muted-foreground truncate">Locações finalizadas</div>
              </div>
            </Card>
          </Link>
          <Link to="/app/relatorios">
            <Card className="p-4 flex items-center gap-3 hover:bg-muted/40 transition">
              <div className="h-10 w-10 rounded-xl grid place-items-center bg-accent/20 text-accent-foreground">
                <BarChart3 className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <div className="font-semibold">Relatórios</div>
                <div className="text-xs text-muted-foreground truncate">Faturamento e rankings</div>
              </div>
            </Card>
          </Link>
        </div>
      </div>
    </AppShell>
  );
}

function TopVehiclePhoto({ path, name }: { path: string | null; name: string }) {
  const src = useVehiclePhotoUrl(path);
  if (src) return <img loading="lazy" decoding="async" src={src} alt={name} className="h-12 w-12 rounded-xl object-cover" />;
  return <div className="h-12 w-12 rounded-xl bg-accent/20 grid place-items-center text-2xl">🏎️</div>;
}

function ActiveVehiclePhoto({ path, name }: { path: string | null; name: string }) {
  const src = useVehiclePhotoUrl(path);
  if (src) return <img loading="lazy" decoding="async" src={src} alt={name} className="h-12 w-12 rounded-xl object-cover" />;
  return <div className="h-12 w-12 rounded-xl bg-muted grid place-items-center text-2xl">🚗</div>;
}
