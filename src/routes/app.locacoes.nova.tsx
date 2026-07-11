import { createFileRoute, Link } from "@tanstack/react-router";
import { AppShell } from "@/components/app-shell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { vehicles, packages, locations, currency } from "@/lib/mock-data";
import { useState } from "react";
import { Check, ArrowLeft } from "lucide-react";

export const Route = createFileRoute("/app/locacoes/nova")({
  head: () => ({
    meta: [
      { title: "Nova locação — MiniCar Gestão" },
      { name: "description", content: "Inicie uma nova locação selecionando local, veículo e tempo." },
    ],
  }),
  component: NovaLocacaoPage,
});

function NovaLocacaoPage() {
  const activeLocations = locations.filter((l) => l.active);
  const multipleLocations = activeLocations.length > 1;
  const [locationId, setLocationId] = useState<string | null>(
    multipleLocations ? null : activeLocations[0]?.id ?? null
  );
  const [vehicleId, setVehicleId] = useState<string | null>(null);
  const [packageId, setPackageId] = useState<string | null>(null);

  const availableVehicles = vehicles.filter(
    (v) => v.status === "disponivel" && v.location === activeLocations.find((l) => l.id === locationId)?.name
  );
  const selectedPkg = packages.find((p) => p.id === packageId);

  return (
    <AppShell title="Nova locação">
      <Link to="/app" className="inline-flex items-center gap-1 text-sm text-muted-foreground mb-4">
        <ArrowLeft className="h-4 w-4" /> Voltar
      </Link>

      <div className="space-y-6">
        {multipleLocations && (
          <Section step="1" title="Escolha o local">
            <div className="grid gap-2">
              {activeLocations.map((l) => (
                <button
                  key={l.id}
                  onClick={() => setLocationId(l.id)}
                  className={`text-left p-4 rounded-xl border-2 transition-all ${
                    locationId === l.id
                      ? "border-primary bg-primary-soft"
                      : "border-border bg-card"
                  }`}
                >
                  <div className="font-semibold">{l.name}</div>
                  <div className="text-xs text-muted-foreground">
                    {l.type} · {l.city}/{l.state}
                  </div>
                </button>
              ))}
            </div>
          </Section>
        )}

        {locationId && (
          <Section step={multipleLocations ? "2" : "1"} title="Escolha o veículo">
            {availableVehicles.length === 0 ? (
              <Card className="p-4 text-sm text-muted-foreground">
                Nenhum veículo disponível neste local no momento.
              </Card>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                {availableVehicles.map((v) => (
                  <button
                    key={v.id}
                    onClick={() => setVehicleId(v.id)}
                    className={`p-3 rounded-xl border-2 flex flex-col items-center text-center transition-all ${
                      vehicleId === v.id
                        ? "border-primary bg-primary-soft"
                        : "border-border bg-card"
                    }`}
                  >
                    <div className="text-4xl mb-1">{v.photo}</div>
                    <div className="text-sm font-semibold truncate w-full">{v.name}</div>
                    <div className="text-[10px] text-muted-foreground">{v.code}</div>
                  </button>
                ))}
              </div>
            )}
          </Section>
        )}

        {vehicleId && (
          <Section step={multipleLocations ? "3" : "2"} title="Escolha o tempo">
            <div className="grid grid-cols-2 gap-2">
              {packages.map((p) => (
                <button
                  key={p.id}
                  onClick={() => setPackageId(p.id)}
                  className={`p-4 rounded-xl border-2 transition-all ${
                    packageId === p.id
                      ? "border-primary bg-primary-soft"
                      : "border-border bg-card"
                  }`}
                >
                  <div className="text-lg font-bold">{p.minutes} min</div>
                  <div className="text-sm text-primary font-semibold">{currency(p.price)}</div>
                </button>
              ))}
            </div>
          </Section>
        )}

        {packageId && (
          <Card className="p-4 bg-primary-soft border-primary/30">
            <div className="text-sm text-muted-foreground mb-2">Resumo</div>
            <div className="space-y-1 text-sm">
              <Row k="Local" v={activeLocations.find((l) => l.id === locationId)?.name ?? ""} />
              <Row k="Veículo" v={vehicles.find((v) => v.id === vehicleId)?.name ?? ""} />
              <Row k="Tempo" v={`${selectedPkg?.minutes} minutos`} />
              <Row k="Valor" v={currency(selectedPkg?.price ?? 0)} highlight />
            </div>
            <Button className="w-full h-14 mt-4 text-base font-bold gap-2">
              <Check className="h-5 w-5" /> Iniciar locação
            </Button>
          </Card>
        )}
      </div>
    </AppShell>
  );
}

function Section({
  step,
  title,
  children,
}: {
  step: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <div className="h-7 w-7 rounded-full bg-primary text-primary-foreground grid place-items-center text-sm font-bold">
          {step}
        </div>
        <h2 className="font-bold">{title}</h2>
      </div>
      {children}
    </div>
  );
}

function Row({ k, v, highlight }: { k: string; v: string; highlight?: boolean }) {
  return (
    <div className="flex justify-between">
      <span className="text-muted-foreground">{k}</span>
      <span className={highlight ? "font-bold text-primary" : "font-medium"}>{v}</span>
    </div>
  );
}
