import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { AppShell } from "@/components/app-shell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { currency } from "@/lib/mock-data";
import { useState } from "react";
import { Check, ArrowLeft, Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

const packages = [
  { id: "p1", minutes: 5, price: 8 },
  { id: "p2", minutes: 10, price: 15 },
  { id: "p3", minutes: 15, price: 22 },
  { id: "p4", minutes: 20, price: 28 },
  { id: "p5", minutes: 30, price: 40 },
];

export const Route = createFileRoute("/app/locacoes/nova")({
  head: () => ({
    meta: [
      { title: "Nova locação — MiniCar Gestão" },
      { name: "description", content: "Inicie uma nova locação selecionando o veículo e o tempo." },
    ],
  }),
  component: NovaLocacaoPage,
});

function NovaLocacaoPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();

  const [vehicleId, setVehicleId] = useState<string | null>(null);
  const [packageId, setPackageId] = useState<string | null>(null);

  const { data: availableVehicles = [] } = useQuery({
    queryKey: ["vehicles-disp", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("vehicles")
        .select("id,name,photo_url,status")
        .eq("user_id", user!.id)
        .eq("status", "disponivel")
        .order("name");
      if (error) throw error;
      return data;
    },
  });

  const selectedPkg = packages.find((p) => p.id === packageId);

  const startRental = useMutation({
    mutationFn: async () => {
      if (!user || !vehicleId || !selectedPkg) throw new Error("Dados incompletos");
      const startedAt = new Date();
      const plannedEnd = new Date(startedAt.getTime() + selectedPkg.minutes * 60000);
      const { error } = await supabase.from("rentals").insert({
        user_id: user.id,
        vehicle_id: vehicleId,
        planned_minutes: selectedPkg.minutes,
        amount: selectedPkg.price,
        started_at: startedAt.toISOString(),
        planned_end_at: plannedEnd.toISOString(),
        status: "ativa",
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Locação iniciada!");
      qc.invalidateQueries({ queryKey: ["rentals-ativas"] });
      qc.invalidateQueries({ queryKey: ["vehicles"] });
      navigate({ to: "/app/locacoes" });
    },
    onError: (e: Error) => toast.error(e.message || "Não foi possível iniciar a locação."),
  });

  return (
    <AppShell title="Nova locação">
      <Link to="/app" className="inline-flex items-center gap-1 text-sm text-muted-foreground mb-4">
        <ArrowLeft className="h-4 w-4" /> Voltar
      </Link>

      <div className="space-y-6">
        <Section step="1" title="Escolha o veículo">
          {availableVehicles.length === 0 ? (
            <Card className="p-4 text-sm text-muted-foreground">
              Nenhum veículo disponível.{" "}
              <Link to="/app/veiculos" className="text-primary font-medium">Cadastrar veículo</Link>
            </Card>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {availableVehicles.map((v) => (
                <button
                  key={v.id}
                  onClick={() => setVehicleId(v.id)}
                  className={`p-3 rounded-xl border-2 flex flex-col items-center text-center transition-all ${
                    vehicleId === v.id ? "border-primary bg-primary-soft" : "border-border bg-card"
                  }`}
                >
                  {v.photo_url ? (
                    <img src={v.photo_url} alt={v.name} className="h-16 w-16 rounded-lg object-cover mb-1" />
                  ) : (
                    <div className="h-16 w-16 rounded-lg bg-muted grid place-items-center text-3xl mb-1">🚗</div>
                  )}
                  <div className="text-sm font-semibold truncate w-full">{v.name}</div>
                </button>
              ))}
            </div>
          )}
        </Section>

        {vehicleId && (
          <Section step="2" title="Escolha o tempo">
            <div className="grid grid-cols-2 gap-2">
              {packages.map((p) => (
                <button
                  key={p.id}
                  onClick={() => setPackageId(p.id)}
                  className={`p-4 rounded-xl border-2 transition-all ${
                    packageId === p.id ? "border-primary bg-primary-soft" : "border-border bg-card"
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
              <Row k="Veículo" v={availableVehicles.find((v) => v.id === vehicleId)?.name ?? ""} />
              <Row k="Tempo" v={`${selectedPkg?.minutes} minutos`} />
              <Row k="Valor" v={currency(selectedPkg?.price ?? 0)} highlight />
            </div>
            <Button
              className="w-full h-14 mt-4 text-base font-bold gap-2"
              disabled={startRental.isPending}
              onClick={() => startRental.mutate()}
            >
              {startRental.isPending ? <Loader2 className="h-5 w-5 animate-spin" /> : <Check className="h-5 w-5" />}
              Iniciar locação
            </Button>
          </Card>
        )}
      </div>
    </AppShell>
  );
}

function Section({ step, title, children }: { step: string; title: string; children: React.ReactNode }) {
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
