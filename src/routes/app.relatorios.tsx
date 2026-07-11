import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/app-shell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { currency } from "@/lib/mock-data";
import { Download, TrendingUp } from "lucide-react";

export const Route = createFileRoute("/app/relatorios")({
  head: () => ({
    meta: [
      { title: "Relatórios — MiniCar Gestão" },
      { name: "description", content: "Analise faturamento, tempo médio e desempenho por veículo e local." },
    ],
  }),
  component: RelatoriosPage,
});

const bars = [40, 65, 30, 78, 55, 92, 48];
const dias = ["S", "T", "Q", "Q", "S", "S", "D"];

function RelatoriosPage() {
  return (
    <AppShell title="Relatórios">
      <div className="space-y-5">
        <div className="grid grid-cols-2 gap-3">
          <Card className="p-4">
            <div className="text-xs text-muted-foreground">Faturamento mês</div>
            <div className="text-xl font-bold text-primary">{currency(4870)}</div>
            <div className="text-xs text-success flex items-center gap-1 mt-1">
              <TrendingUp className="h-3 w-3" /> +12% vs mês anterior
            </div>
          </Card>
          <Card className="p-4">
            <div className="text-xs text-muted-foreground">Locações mês</div>
            <div className="text-xl font-bold">248</div>
            <div className="text-xs text-success flex items-center gap-1 mt-1">
              <TrendingUp className="h-3 w-3" /> +8%
            </div>
          </Card>
          <Card className="p-4">
            <div className="text-xs text-muted-foreground">Ticket médio</div>
            <div className="text-xl font-bold">{currency(19.6)}</div>
          </Card>
          <Card className="p-4">
            <div className="text-xs text-muted-foreground">Tempo médio</div>
            <div className="text-xl font-bold">14 min</div>
          </Card>
        </div>

        <Card className="p-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-bold text-sm">Faturamento por dia</h2>
            <span className="text-xs text-muted-foreground">Últimos 7 dias</span>
          </div>
          <div className="flex items-end gap-2 h-32">
            {bars.map((h, i) => (
              <div key={i} className="flex-1 flex flex-col items-center gap-1">
                <div
                  className="w-full rounded-t-md bg-primary"
                  style={{ height: `${h}%` }}
                />
                <span className="text-[10px] text-muted-foreground">{dias[i]}</span>
              </div>
            ))}
          </div>
        </Card>

        <Card className="p-4">
          <h2 className="font-bold text-sm mb-3">Top veículos</h2>
          <div className="space-y-3">
            {[
              { name: "Caminhonete Preta", value: 2280, pct: 100 },
              { name: "Mustang Vermelho", value: 1920, pct: 84 },
              { name: "Jipe Azul", value: 1440, pct: 63 },
              { name: "Moto Rosa", value: 1110, pct: 49 },
            ].map((v) => (
              <div key={v.name}>
                <div className="flex justify-between text-xs mb-1">
                  <span className="font-medium">{v.name}</span>
                  <span className="font-semibold">{currency(v.value)}</span>
                </div>
                <div className="h-2 rounded-full bg-muted overflow-hidden">
                  <div
                    className="h-full bg-primary rounded-full"
                    style={{ width: `${v.pct}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Button variant="outline" className="w-full h-12 gap-2">
          <Download className="h-4 w-4" /> Exportar CSV
        </Button>
      </div>
    </AppShell>
  );
}
