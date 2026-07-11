import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/app-shell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { activeRentals, currency, timeBR } from "@/lib/mock-data";
import { RefreshCw, Square, MapPin, Clock } from "lucide-react";

export const Route = createFileRoute("/app/locacoes")({
  head: () => ({
    meta: [
      { title: "Locações ativas — MiniCar Gestão" },
      { name: "description", content: "Acompanhe as locações em andamento e o tempo restante de cada veículo." },
    ],
  }),
  component: LocacoesPage,
});

function LocacoesPage() {
  return (
    <AppShell title="Locações ativas">
      <div className="space-y-3">
        {activeRentals.map((r) => {
          const total = (r.end.getTime() - r.start.getTime()) / 60000;
          const remaining = Math.max(0, (r.end.getTime() - Date.now()) / 60000);
          const pct = Math.max(0, Math.min(100, (remaining / total) * 100));
          const urgent = remaining <= 1;
          const warning = remaining <= 2 && !urgent;
          return (
            <Card
              key={r.id}
              className={`p-4 ${
                urgent
                  ? "border-destructive border-2 bg-destructive/5"
                  : warning
                  ? "border-warning border-2 bg-warning/5"
                  : ""
              }`}
            >
              <div className="flex gap-3">
                <div className="h-16 w-16 rounded-xl bg-muted grid place-items-center text-3xl shrink-0">
                  {r.vehicle.photo}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-bold truncate">{r.vehicle.name}</div>
                  <div className="text-xs text-muted-foreground flex items-center gap-1 truncate">
                    <MapPin className="h-3 w-3" /> {r.location}
                  </div>
                  <div className="mt-1 text-xs text-muted-foreground flex items-center gap-1">
                    <Clock className="h-3 w-3" /> {timeBR(r.start)} → {timeBR(r.end)}
                  </div>
                </div>
              </div>

              <div className="mt-4">
                <div className="flex justify-between items-baseline mb-1.5">
                  <span
                    className={`text-2xl font-bold ${
                      urgent
                        ? "text-destructive"
                        : warning
                        ? "text-warning-foreground"
                        : "text-primary"
                    }`}
                  >
                    {Math.ceil(remaining)} min
                  </span>
                  <span className="text-sm font-semibold">{currency(r.amount)}</span>
                </div>
                <Progress value={pct} className="h-2.5" />
              </div>

              <div className="mt-4 grid grid-cols-2 gap-2">
                <Button variant="outline" className="h-11 gap-1.5">
                  <RefreshCw className="h-4 w-4" /> Renovar
                </Button>
                <Button className="h-11 gap-1.5" variant="destructive">
                  <Square className="h-4 w-4" /> Finalizar
                </Button>
              </div>
            </Card>
          );
        })}
      </div>
    </AppShell>
  );
}
