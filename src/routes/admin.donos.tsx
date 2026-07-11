import { createFileRoute, Link } from "@tanstack/react-router";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ownersList, dateBR } from "@/lib/mock-data";
import { Search, ChevronRight } from "lucide-react";
import { AdminShell } from "./admin.index";

export const Route = createFileRoute("/admin/donos")({
  head: () => ({
    meta: [
      { title: "Donos cadastrados — Admin" },
      { name: "description", content: "Lista de donos de veículos cadastrados na plataforma." },
    ],
  }),
  component: DonosPage,
});

const statusStyle: Record<string, string> = {
  ativo: "bg-success/15 text-success border-success/30",
  pendente: "bg-warning/20 text-warning-foreground border-warning/40",
  suspenso: "bg-destructive/15 text-destructive border-destructive/30",
};

function DonosPage() {
  return (
    <AdminShell title="Donos cadastrados">
      <div className="space-y-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Buscar por nome, cidade ou negócio" className="h-12 pl-10" />
        </div>
        <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
          {["Todos", "Ativos", "Pendentes", "Suspensos", "Assinatura vencida"].map((f, i) => (
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
          {ownersList.map((o) => (
            <Link key={o.id} to="/admin/donos/$id" params={{ id: o.id }}>
              <Card className="p-4 hover:bg-muted/40 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="h-11 w-11 rounded-full bg-primary text-primary-foreground grid place-items-center font-bold shrink-0">
                    {o.name
                      .split(" ")
                      .map((n) => n[0])
                      .slice(0, 2)
                      .join("")}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="font-semibold truncate">{o.name}</div>
                        <div className="text-xs text-muted-foreground truncate">
                          {o.business} · {o.city}/{o.state}
                        </div>
                      </div>
                      <Badge
                        variant="outline"
                        className={statusStyle[o.status] ?? "bg-muted"}
                      >
                        {o.status}
                      </Badge>
                    </div>
                    <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
                      <span>Entrou em {dateBR(o.joined)}</span>
                      <span className="capitalize">Assinatura: {o.subscription}</span>
                    </div>
                  </div>
                  <ChevronRight className="h-5 w-5 text-muted-foreground shrink-0" />
                </div>
              </Card>
            </Link>
          ))}
        </div>
      </div>
    </AdminShell>
  );
}
