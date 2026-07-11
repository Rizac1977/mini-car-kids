import { createFileRoute, Link } from "@tanstack/react-router";
import { AppShell } from "@/components/app-shell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { vehicles, currency, type VehicleStatus } from "@/lib/mock-data";
import { Plus, Search } from "lucide-react";

export const Route = createFileRoute("/app/veiculos")({
  head: () => ({
    meta: [
      { title: "Veículos — MiniCar Gestão" },
      { name: "description", content: "Gerencie os veículos elétricos infantis do seu negócio." },
    ],
  }),
  component: VeiculosPage,
});

const statusLabel: Record<VehicleStatus, { label: string; className: string }> = {
  disponivel: { label: "Disponível", className: "bg-success/15 text-success border-success/30" },
  em_locacao: { label: "Em locação", className: "bg-accent/20 text-accent-foreground border-accent/40" },
  manutencao: { label: "Manutenção", className: "bg-warning/20 text-warning-foreground border-warning/40" },
  inativo: { label: "Inativo", className: "bg-muted text-muted-foreground border-border" },
};

function VeiculosPage() {
  return (
    <AppShell title="Veículos">
      <div className="space-y-4">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Buscar por nome ou código" className="h-12 pl-10" />
          </div>
          <Link to="/app/veiculos/novo">
            <Button className="h-12 px-4">
              <Plus className="h-5 w-5" />
            </Button>
          </Link>
        </div>

        <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
          {["Todos", "Disponíveis", "Em locação", "Manutenção", "Inativos"].map((f, i) => (
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

        <div className="space-y-3">
          {vehicles.map((v) => {
            const s = statusLabel[v.status];
            return (
              <Card key={v.id} className="p-4">
                <div className="flex gap-3">
                  <div className="h-16 w-16 rounded-xl bg-muted grid place-items-center text-3xl shrink-0">
                    {v.photo}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="font-semibold truncate">{v.name}</div>
                        <div className="text-xs text-muted-foreground">
                          {v.code} · {v.location}
                        </div>
                      </div>
                      <Badge variant="outline" className={s.className}>
                        {s.label}
                      </Badge>
                    </div>
                    <div className="mt-3 flex items-center justify-between text-xs">
                      <div>
                        <span className="text-muted-foreground">Locações: </span>
                        <span className="font-semibold">{v.rentals}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Faturamento: </span>
                        <span className="font-semibold">{currency(v.revenue)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      </div>
    </AppShell>
  );
}
