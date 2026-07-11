import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/app-shell";
import { Card } from "@/components/ui/card";
import { history, currency, dateBR, timeBR } from "@/lib/mock-data";
import { MapPin, Clock } from "lucide-react";

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
  return (
    <AppShell title="Histórico">
      <div className="space-y-4">
        <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
          {["Hoje", "Ontem", "Semana", "Mês", "Ano", "Personalizado"].map((f, i) => (
            <button
              key={f}
              className={`shrink-0 px-4 h-9 rounded-full text-sm font-medium border ${
                i === 0
                  ? "bg-foreground text-background border-foreground"
                  : "bg-card text-foreground border-border"
              }`}
            >
              {f}
            </button>
          ))}
        </div>

        <Card className="p-4 bg-primary-soft border-primary/30">
          <div className="grid grid-cols-3 gap-3 text-center">
            <div>
              <div className="text-xs text-muted-foreground">Locações</div>
              <div className="text-lg font-bold">{history.length}</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Total</div>
              <div className="text-lg font-bold text-primary">
                {currency(history.reduce((s, h) => s + h.amount, 0))}
              </div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Ticket médio</div>
              <div className="text-lg font-bold">
                {currency(history.reduce((s, h) => s + h.amount, 0) / history.length)}
              </div>
            </div>
          </div>
        </Card>

        <div className="space-y-3">
          {history.map((h) => (
            <Card key={h.id} className="p-4">
              <div className="flex gap-3">
                <div className="h-12 w-12 rounded-xl bg-muted grid place-items-center text-2xl shrink-0">
                  {h.photo}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="font-semibold truncate">{h.vehicle}</div>
                      <div className="text-xs text-muted-foreground flex items-center gap-1 truncate">
                        <MapPin className="h-3 w-3" /> {h.location}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-primary">{currency(h.amount)}</div>
                      <div className="text-xs text-muted-foreground flex items-center gap-1 justify-end">
                        <Clock className="h-3 w-3" /> {h.duration} min
                      </div>
                    </div>
                  </div>
                  <div className="mt-2 text-xs text-muted-foreground">
                    {dateBR(h.date)} · {timeBR(h.date)}
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </AppShell>
  );
}
