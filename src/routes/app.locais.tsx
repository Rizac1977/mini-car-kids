import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/app-shell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { locations } from "@/lib/mock-data";
import { MapPin, Plus, Edit } from "lucide-react";

export const Route = createFileRoute("/app/locais")({
  head: () => ({
    meta: [
      { title: "Locais de atuação — MiniCar Gestão" },
      { name: "description", content: "Cadastre e gerencie os locais onde seus veículos operam." },
    ],
  }),
  component: LocaisPage,
});

function LocaisPage() {
  return (
    <AppShell title="Locais de atuação">
      <div className="space-y-4">
        <Button className="w-full h-12 gap-2 font-semibold">
          <Plus className="h-5 w-5" /> Novo local
        </Button>

        <div className="space-y-3">
          {locations.map((l) => (
            <Card key={l.id} className="p-4">
              <div className="flex gap-3">
                <div className="h-12 w-12 rounded-xl bg-primary-soft text-primary grid place-items-center shrink-0">
                  <MapPin className="h-5 w-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="font-semibold truncate">{l.name}</div>
                      <div className="text-xs text-muted-foreground truncate">
                        {l.type} · {l.city}/{l.state}
                      </div>
                    </div>
                    <Badge
                      variant="outline"
                      className={
                        l.active
                          ? "bg-success/15 text-success border-success/30"
                          : "bg-muted text-muted-foreground"
                      }
                    >
                      {l.active ? "Ativo" : "Inativo"}
                    </Badge>
                  </div>
                  <button className="mt-3 inline-flex items-center gap-1 text-xs text-primary font-medium">
                    <Edit className="h-3.5 w-3.5" /> Editar
                  </button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </AppShell>
  );
}
