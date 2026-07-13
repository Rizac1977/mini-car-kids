import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { AppShell } from "@/components/app-shell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { currency } from "@/lib/mock-data";
import { useState } from "react";
import { Check, ArrowLeft, Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useVehiclePhotoUrl } from "@/hooks/use-vehicle-photo";


const quickMinutes = [5, 10, 15, 20, 30];


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
  const [minutes, setMinutes] = useState<string>("");
  const [price, setPrice] = useState<string>("");

  const { data: availableVehicles = [] } = useQuery({
    queryKey: ["vehicles-nova", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("vehicles")
        .select("id,name,photo_url,status")
        .eq("user_id", user!.id)
        .order("name");
      if (error) throw error;
      return data;
    },
  });

  const minutesNum = Number(minutes);
  const priceNum = Number(price.replace(",", "."));
  const isValid = vehicleId && minutesNum > 0 && priceNum >= 0 && !Number.isNaN(priceNum);


  const startRental = useMutation({
    mutationFn: async () => {
      if (!user || !vehicleId || !isValid) throw new Error("Dados incompletos");
      const startedAt = new Date();
      const plannedEnd = new Date(startedAt.getTime() + minutesNum * 60000);
      const { error } = await supabase.from("rentals").insert({
        user_id: user.id,
        vehicle_id: vehicleId,
        planned_minutes: minutesNum,
        amount: priceNum,
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
                <VehicleTile
                  key={v.id}
                  id={v.id}
                  name={v.name}
                  photoPath={v.photo_url}
                  status={v.status as "disponivel" | "em_locacao" | "manutencao" | "inativo"}
                  selected={vehicleId === v.id}
                  onSelect={() => setVehicleId(v.id)}
                />
              ))}
            </div>
          )}
        </Section>

        {vehicleId && (
          <Section step="2" title="Defina tempo e valor">
            <div className="space-y-4">
              <div>
                <Label className="text-xs text-muted-foreground mb-2 block">Sugestões rápidas (min)</Label>
                <div className="grid grid-cols-5 gap-2">
                  {quickMinutes.map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setMinutes(String(m))}
                      className={`py-2 rounded-lg border-2 text-sm font-semibold transition-all ${
                        minutes === String(m) ? "border-primary bg-primary-soft" : "border-border bg-card"
                      }`}
                    >
                      {m}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="min" className="text-sm">Tempo (min)</Label>
                  <Input
                    id="min"
                    type="number"
                    inputMode="numeric"
                    min={1}
                    placeholder="Ex: 10"
                    value={minutes}
                    onChange={(e) => setMinutes(e.target.value)}
                    className="h-12 text-base mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="val" className="text-sm">Valor (R$)</Label>
                  <Input
                    id="val"
                    type="text"
                    inputMode="decimal"
                    placeholder="Ex: 15,00"
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    className="h-12 text-base mt-1"
                  />
                </div>
              </div>
            </div>
          </Section>
        )}

        {isValid && (
          <Card className="p-4 bg-primary-soft border-primary/30">
            <div className="text-sm text-muted-foreground mb-2">Resumo</div>
            <div className="space-y-1 text-sm">
              <Row k="Veículo" v={availableVehicles.find((v) => v.id === vehicleId)?.name ?? ""} />
              <Row k="Tempo" v={`${minutesNum} minutos`} />
              <Row k="Valor" v={currency(priceNum)} highlight />
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

type VehicleTileStatus = "disponivel" | "em_locacao" | "manutencao" | "inativo";

function VehicleTile({ id, name, photoPath, status, selected, onSelect }: {
  id: string; name: string; photoPath: string | null; status: VehicleTileStatus; selected: boolean; onSelect: () => void;
}) {
  const src = useVehiclePhotoUrl(photoPath);
  const disabled = status !== "disponivel";
  const statusLabel: Record<VehicleTileStatus, string> = {
    disponivel: "",
    em_locacao: "Em locação",
    manutencao: "Manutenção",
    inativo: "Indisponível",
  };
  return (
    <button
      key={id}
      onClick={onSelect}
      disabled={disabled}
      aria-disabled={disabled}
      title={disabled ? statusLabel[status] : undefined}
      className={`p-3 rounded-xl border-2 flex flex-col items-center text-center transition-all ${
        disabled
          ? "border-border bg-muted/40 opacity-60 cursor-not-allowed"
          : selected
            ? "border-primary bg-primary-soft"
            : "border-border bg-card"
      }`}
    >
      {src ? (
        <img loading="lazy" decoding="async" src={src} alt={name} className={`h-16 w-16 rounded-lg object-cover mb-1 ${disabled ? "grayscale" : ""}`} />
      ) : (
        <div className="h-16 w-16 rounded-lg bg-muted grid place-items-center text-3xl mb-1">🚗</div>
      )}
      <div className="text-sm font-semibold truncate w-full">{name}</div>
      {disabled && (
        <span className="mt-1 text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full bg-warning/20 text-warning-foreground border border-warning/40">
          {statusLabel[status]}
        </span>
      )}
    </button>
  );
}
