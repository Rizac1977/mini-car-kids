import { createFileRoute, Link } from "@tanstack/react-router";
import { AppShell } from "@/components/app-shell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { activeRentals, currency } from "@/lib/mock-data";
import {
  DollarSign,
  Timer,
  Car,
  CarFront,
  Ticket,
  Clock,
  Trophy,
  AlertCircle,
} from "lucide-react";

export const Route = createFileRoute("/app/")({
  head: () => ({
    meta: [
      { title: "Dashboard — MiniCar Gestão" },
      { name: "description", content: "Painel do dono com faturamento, locações e veículos em uso." },
    ],
  }),
  component: DashboardPage,
});

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

function DashboardPage() {
  return (
    <AppShell title="Olá, Carlos 👋">
      <div className="space-y-6">
        <div className="grid grid-cols-2 gap-3">
          <Stat icon={DollarSign} label="Faturamento hoje" value={currency(487)} tone="primary" />
          <Stat icon={Timer} label="Locações hoje" value="23" />
          <Stat icon={Car} label="Disponíveis" value="4" />
          <Stat icon={CarFront} label="Em uso" value="2" tone="accent" />
          <Stat icon={Ticket} label="Ticket médio" value={currency(21.2)} />
          <Stat icon={Clock} label="Tempo médio" value="14 min" />
        </div>

        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-xl bg-accent/20 grid place-items-center text-2xl">
              🏎️
            </div>
            <div className="flex-1">
              <div className="text-xs text-muted-foreground">Veículo mais utilizado</div>
              <div className="font-bold">Mustang Vermelho</div>
              <div className="text-xs text-muted-foreground">128 locações este mês</div>
            </div>
            <Trophy className="h-5 w-5 text-accent" />
          </div>
        </Card>

        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-bold">Próximas a terminar</h2>
            <Link to="/app/locacoes" className="text-sm text-primary font-medium">
              Ver todas
            </Link>
          </div>
          <div className="space-y-3">
            {activeRentals.slice(0, 2).map((r) => {
              const remaining = Math.max(
                0,
                Math.ceil((r.end.getTime() - Date.now()) / 60000)
              );
              return (
                <Card key={r.id} className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="h-12 w-12 rounded-xl bg-muted grid place-items-center text-2xl">
                      {r.vehicle.photo}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold truncate">{r.vehicle.name}</div>
                      <div className="text-xs text-muted-foreground truncate">{r.location}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs text-muted-foreground">Restante</div>
                      <div
                        className={`font-bold ${
                          remaining <= 2 ? "text-destructive" : "text-primary"
                        }`}
                      >
                        {remaining} min
                      </div>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        </div>

        <Card className="p-4 border-warning/40 bg-warning/10">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-warning-foreground shrink-0 mt-0.5" />
            <div className="text-sm">
              <div className="font-semibold">Sua assinatura vence em 22 dias</div>
              <div className="text-muted-foreground">
                Renove com antecedência para não interromper suas locações.
              </div>
            </div>
          </div>
        </Card>

        <Link to="/app/locacoes/nova">
          <Button className="w-full h-14 text-base font-bold">+ Iniciar nova locação</Button>
        </Link>
      </div>
    </AppShell>
  );
}
