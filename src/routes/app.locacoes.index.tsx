import { createFileRoute, Link } from "@tanstack/react-router";
import { AppShell } from "@/components/app-shell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { currency, timeBR } from "@/lib/mock-data";
import {
  RefreshCw,
  Square,
  Clock,
  Plus,
  Loader2,
  Pause,
  Play,
  Ban,
  CheckCircle2,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useVehiclePhotoUrl } from "@/hooks/use-vehicle-photo";

type ActiveRental = {
  id: string;
  vehicle_id: string;
  planned_minutes: number;
  amount: number;
  started_at: string;
  planned_end_at: string;
  paused_at: string | null;
  vehicles: { name: string; photo_url: string | null } | null;
};

type Renewal = {
  id: string;
  added_minutes: number;
  added_amount: number;
  previous_end_at: string;
  new_end_at: string;
  created_at: string;
};

type FinalSummary = {
  vehicleName: string;
  startedAt: string;
  endedAt: string;
  initialMinutes: number;
  renewedMinutes: number;
  totalMinutes: number;
  initialAmount: number;
  renewalsAmount: number;
  totalAmount: number;
};

function fmtCountdown(ms: number) {
  const s = Math.max(0, Math.ceil(ms / 1000));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${String(m).padStart(2, "0")}:${String(r).padStart(2, "0")}`;
}

function fmtMinutes(min: number) {
  const h = Math.floor(min / 60);
  const m = min % 60;
  if (h === 0) return `${m} min`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}min`;
}

export const Route = createFileRoute("/app/locacoes/")({
  head: () => ({
    meta: [
      { title: "Locações ativas — MiniCar Gestão" },
      { name: "description", content: "Acompanhe as locações em andamento e o tempo restante de cada veículo." },
    ],
  }),
  component: LocacoesPage,
});

function LocacoesPage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [, setTick] = useState(0);

  const [renewTarget, setRenewTarget] = useState<ActiveRental | null>(null);
  const [finalizeTarget, setFinalizeTarget] = useState<ActiveRental | null>(null);
  const [cancelTarget, setCancelTarget] = useState<ActiveRental | null>(null);
  const [summary, setSummary] = useState<FinalSummary | null>(null);
  const alertedRef = useRef<Set<string>>(new Set());
  const audioCtxRef = useRef<AudioContext | null>(null);

  useEffect(() => {
    const t = setInterval(() => setTick((n) => n + 1), 1000);
    return () => clearInterval(t);
  }, []);

  function playAlarm() {
    try {
      const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AC) return;
      if (!audioCtxRef.current) audioCtxRef.current = new AC();
      const ctx = audioCtxRef.current;
      if (ctx.state === "suspended") ctx.resume().catch(() => {});
      const now = ctx.currentTime;
      // 3 beeps
      for (let i = 0; i < 3; i++) {
        const t0 = now + i * 0.5;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "square";
        osc.frequency.setValueAtTime(880, t0);
        gain.gain.setValueAtTime(0.0001, t0);
        gain.gain.exponentialRampToValueAtTime(0.35, t0 + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.35);
        osc.connect(gain).connect(ctx.destination);
        osc.start(t0);
        osc.stop(t0 + 0.4);
      }
      if (navigator.vibrate) navigator.vibrate([250, 120, 250, 120, 250]);
    } catch {
      // ignore
    }
  }

  const { data: rentals = [], isLoading } = useQuery({
    queryKey: ["rentals-ativas", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("rentals")
        .select("id,vehicle_id,planned_minutes,amount,started_at,planned_end_at,paused_at,vehicles(name,photo_url)")
        .eq("user_id", user!.id)
        .eq("status", "ativa")
        .order("planned_end_at");
      if (error) throw error;
      return data as unknown as ActiveRental[];
    },
    refetchInterval: 30000,
  });

  async function fetchRenewals(rentalId: string): Promise<Renewal[]> {
    const { data, error } = await supabase
      .from("rental_renewals")
      .select("id,added_minutes,added_amount,previous_end_at,new_end_at,created_at")
      .eq("rental_id", rentalId)
      .order("created_at");
    if (error) throw error;
    return (data ?? []) as Renewal[];
  }

  const finalize = useMutation({
    mutationFn: async (r: ActiveRental) => {
      const endedAt = new Date().toISOString();
      const renewals = await fetchRenewals(r.id);
      const { error } = await supabase
        .from("rentals")
        .update({ status: "finalizada", ended_at: endedAt })
        .eq("id", r.id);
      if (error) throw error;

      const renewedMinutes = renewals.reduce((s, x) => s + Number(x.added_minutes), 0);
      const renewalsAmount = renewals.reduce((s, x) => s + Number(x.added_amount), 0);
      const initialMinutes = r.planned_minutes - renewedMinutes;
      const initialAmount = Number(r.amount) - renewalsAmount;
      const totalMinutes = Math.max(
        1,
        Math.round((new Date(endedAt).getTime() - new Date(r.started_at).getTime()) / 60000),
      );
      return {
        vehicleName: r.vehicles?.name ?? "Veículo",
        startedAt: r.started_at,
        endedAt,
        initialMinutes,
        renewedMinutes,
        totalMinutes,
        initialAmount,
        renewalsAmount,
        totalAmount: Number(r.amount),
      } satisfies FinalSummary;
    },
    onSuccess: (s) => {
      setFinalizeTarget(null);
      setSummary(s);
      qc.invalidateQueries({ queryKey: ["rentals-ativas"] });
      qc.invalidateQueries({ queryKey: ["vehicles"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const cancel = useMutation({
    mutationFn: async (params: { r: ActiveRental; reason: string }) => {
      const now = new Date().toISOString();
      const { error } = await supabase
        .from("rentals")
        .update({
          status: "cancelada",
          ended_at: now,
          canceled_at: now,
          cancel_reason: params.reason || null,
        })
        .eq("id", params.r.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Locação cancelada");
      setCancelTarget(null);
      qc.invalidateQueries({ queryKey: ["rentals-ativas"] });
      qc.invalidateQueries({ queryKey: ["vehicles"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const renew = useMutation({
    mutationFn: async (params: { r: ActiveRental; minutes: number; amount: number }) => {
      const { r, minutes, amount } = params;
      const previousEnd = new Date(r.planned_end_at);
      const base = previousEnd.getTime() > Date.now() ? previousEnd.getTime() : Date.now();
      const newEnd = new Date(base + minutes * 60000);

      const { error: e1 } = await supabase
        .from("rentals")
        .update({
          planned_end_at: newEnd.toISOString(),
          planned_minutes: r.planned_minutes + minutes,
          amount: Number(r.amount) + amount,
        })
        .eq("id", r.id);
      if (e1) throw e1;

      const { error: e2 } = await supabase.from("rental_renewals").insert({
        rental_id: r.id,
        user_id: user!.id,
        added_minutes: minutes,
        added_amount: amount,
        previous_end_at: previousEnd.toISOString(),
        new_end_at: newEnd.toISOString(),
      });
      if (e2) throw e2;
    },
    onSuccess: () => {
      toast.success("Tempo renovado");
      setRenewTarget(null);
      qc.invalidateQueries({ queryKey: ["rentals-ativas"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const togglePause = useMutation({
    mutationFn: async (r: ActiveRental) => {
      if (r.paused_at) {
        const pausedMs = Date.now() - new Date(r.paused_at).getTime();
        const newEnd = new Date(new Date(r.planned_end_at).getTime() + pausedMs);
        const { error } = await supabase
          .from("rentals")
          .update({ paused_at: null, planned_end_at: newEnd.toISOString() })
          .eq("id", r.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("rentals")
          .update({ paused_at: new Date().toISOString() })
          .eq("id", r.id);
        if (error) throw error;
      }
    },
    onSuccess: (_d, r) => {
      toast.success(r.paused_at ? "Locação retomada" : "Locação pausada");
      qc.invalidateQueries({ queryKey: ["rentals-ativas"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  useEffect(() => {
    const activeIds = new Set(rentals.map((r) => r.id));
    for (const id of alertedRef.current) {
      if (!activeIds.has(id)) alertedRef.current.delete(id);
    }
    for (const r of rentals) {
      if (r.paused_at) continue;
      const end = new Date(r.planned_end_at).getTime();
      if (end - Date.now() <= 0 && !alertedRef.current.has(r.id)) {
        alertedRef.current.add(r.id);
        playAlarm();
        toast.warning(`Tempo encerrado: ${r.vehicles?.name ?? "Veículo"}`, { duration: 8000 });
      }
    }
  });

  return (
    <AppShell title="Locações ativas">
      <div className="mb-4">
        <Button asChild className="w-full h-12 gap-2">
          <Link to="/app/locacoes/nova"><Plus className="h-5 w-5" /> Nova locação</Link>
        </Button>
      </div>

      {isLoading ? (
        <div className="grid place-items-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
      ) : rentals.length === 0 ? (
        <Card className="p-6 text-center text-sm text-muted-foreground">
          Nenhuma locação ativa no momento.
        </Card>
      ) : (
        <div className="space-y-3">
          {rentals.map((r) => {
            const start = new Date(r.started_at).getTime();
            const end = new Date(r.planned_end_at).getTime();
            const totalMs = end - start;
            const isPaused = !!r.paused_at;
            const nowRef = isPaused ? new Date(r.paused_at!).getTime() : Date.now();
            const remainingMs = Math.max(0, end - nowRef);
            const pct = Math.max(0, Math.min(100, (remainingMs / totalMs) * 100));
            const urgent = !isPaused && remainingMs <= 60_000;
            const warning = !isPaused && remainingMs <= 120_000 && !urgent;
            return (
              <Card
                key={r.id}
                className={`p-4 ${
                  isPaused ? "border-muted-foreground/30 border-2 bg-muted/30"
                  : urgent ? "border-destructive border-2 bg-destructive/5"
                  : warning ? "border-warning border-2 bg-warning/5" : ""
                }`}
              >
                <div className="flex gap-3">
                  <VehiclePhoto path={r.vehicles?.photo_url ?? null} name={r.vehicles?.name ?? "Veículo"} size="h-16 w-16 rounded-xl" />

                  <div className="flex-1 min-w-0">
                    <div className="font-bold truncate">{r.vehicles?.name ?? "Veículo"}</div>
                    <div className="mt-0.5 text-xs text-muted-foreground flex items-center gap-1">
                      <Clock className="h-3 w-3" /> {timeBR(r.started_at)} → {timeBR(r.planned_end_at)}
                    </div>
                    {isPaused && (
                      <div className="mt-1 inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-[11px] font-semibold text-muted-foreground">
                        <Pause className="h-3 w-3" /> Pausada
                      </div>
                    )}
                  </div>
                </div>

                <div className="mt-4">
                  <div className="flex justify-between items-baseline mb-1.5">
                    <span className={`text-3xl font-bold tabular-nums ${
                      isPaused ? "text-muted-foreground"
                      : urgent ? "text-destructive"
                      : warning ? "text-warning-foreground"
                      : "text-primary"
                    }`}>
                      {remainingMs > 0 ? fmtCountdown(remainingMs) : "Encerrado"}
                    </span>
                    <span className="text-sm font-semibold">{currency(Number(r.amount))}</span>
                  </div>
                  <Progress value={pct} className="h-2.5" />
                </div>

                <div className="mt-4 grid grid-cols-2 gap-2">
                  <Button
                    variant="outline"
                    className="h-11 gap-1.5"
                    disabled={togglePause.isPending}
                    onClick={() => togglePause.mutate(r)}
                  >
                    {isPaused ? <><Play className="h-4 w-4" /> Retomar</> : <><Pause className="h-4 w-4" /> Pausar</>}
                  </Button>
                  <Button
                    variant="outline"
                    className="h-11 gap-1.5"
                    disabled={isPaused}
                    onClick={() => setRenewTarget(r)}
                  >
                    <RefreshCw className="h-4 w-4" /> Renovar
                  </Button>
                  <Button
                    variant="outline"
                    className="h-11 gap-1.5 text-destructive hover:text-destructive"
                    onClick={() => setCancelTarget(r)}
                  >
                    <Ban className="h-4 w-4" /> Cancelar
                  </Button>
                  <Button
                    className="h-11 gap-1.5"
                    onClick={() => setFinalizeTarget(r)}
                  >
                    <Square className="h-4 w-4" /> Finalizar
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <RenewDialog
        rental={renewTarget}
        open={!!renewTarget}
        onOpenChange={(v) => !v && setRenewTarget(null)}
        onConfirm={(minutes, amount) =>
          renewTarget && renew.mutate({ r: renewTarget, minutes, amount })
        }
        submitting={renew.isPending}
      />

      <AlertDialog open={!!finalizeTarget} onOpenChange={(v) => !v && setFinalizeTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Finalizar locação?</AlertDialogTitle>
            <AlertDialogDescription>
              Isso encerra o cronômetro, libera o veículo e move a locação para o histórico.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={finalize.isPending}>Voltar</AlertDialogCancel>
            <AlertDialogAction
              disabled={finalize.isPending}
              onClick={(e) => {
                e.preventDefault();
                if (finalizeTarget) finalize.mutate(finalizeTarget);
              }}
            >
              {finalize.isPending ? "Finalizando..." : "Confirmar finalização"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <CancelDialog
        rental={cancelTarget}
        open={!!cancelTarget}
        onOpenChange={(v) => !v && setCancelTarget(null)}
        onConfirm={(reason) => cancelTarget && cancel.mutate({ r: cancelTarget, reason })}
        submitting={cancel.isPending}
      />

      <SummaryDialog summary={summary} onClose={() => setSummary(null)} />
    </AppShell>
  );
}

function RenewDialog({
  rental,
  open,
  onOpenChange,
  onConfirm,
  submitting,
}: {
  rental: ActiveRental | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onConfirm: (minutes: number, amount: number) => void;
  submitting: boolean;
}) {
  const [customMinutes, setCustomMinutes] = useState("");
  const [customAmount, setCustomAmount] = useState("");

  useEffect(() => {
    if (open) {
      setCustomMinutes("");
      setCustomAmount("");
    }
  }, [open]);

  const packages = useMemo(() => {
    if (!rental) return [] as { min: number; amount: number }[];
    const ratio = Number(rental.amount) / Math.max(1, rental.planned_minutes);
    return [15, 30, 45, 60].map((min) => ({ min, amount: +(ratio * min).toFixed(2) }));
  }, [rental]);

  const cm = Number(customMinutes);
  const ca = Number(customAmount);
  const customValid = cm > 0 && ca >= 0 && !Number.isNaN(cm) && !Number.isNaN(ca);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Renovar locação</DialogTitle>
          <DialogDescription>
            Escolha um pacote adicional ou informe um tempo e valor personalizados.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            {packages.map((p) => (
              <button
                key={p.min}
                type="button"
                disabled={submitting}
                onClick={() => onConfirm(p.min, p.amount)}
                className="rounded-lg border-2 border-border p-3 text-left hover:border-primary hover:bg-primary/5 transition-colors disabled:opacity-50"
              >
                <div className="text-lg font-bold">+{p.min} min</div>
                <div className="text-sm text-muted-foreground">{currency(p.amount)}</div>
              </button>
            ))}
          </div>

          <div className="pt-2 border-t">
            <div className="text-sm font-semibold mb-2">Personalizado</div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label htmlFor="rmin" className="text-xs">Minutos</Label>
                <Input
                  id="rmin"
                  inputMode="numeric"
                  value={customMinutes}
                  onChange={(e) => setCustomMinutes(e.target.value.replace(/\D/g, ""))}
                  placeholder="Ex.: 20"
                />
              </div>
              <div>
                <Label htmlFor="ramt" className="text-xs">Valor (R$)</Label>
                <Input
                  id="ramt"
                  inputMode="decimal"
                  value={customAmount}
                  onChange={(e) => setCustomAmount(e.target.value.replace(",", "."))}
                  placeholder="Ex.: 15.00"
                />
              </div>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
            Cancelar
          </Button>
          <Button
            disabled={!customValid || submitting}
            onClick={() => onConfirm(cm, ca)}
          >
            {submitting ? "Confirmando..." : "Confirmar renovação"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function CancelDialog({
  rental,
  open,
  onOpenChange,
  onConfirm,
  submitting,
}: {
  rental: ActiveRental | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onConfirm: (reason: string) => void;
  submitting: boolean;
}) {
  const [reason, setReason] = useState("");
  useEffect(() => {
    if (open) setReason("");
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Cancelar locação?</DialogTitle>
          <DialogDescription>
            A locação será marcada como cancelada e o veículo ficará disponível novamente.
            {rental?.vehicles?.name ? ` Veículo: ${rental.vehicles.name}.` : ""}
          </DialogDescription>
        </DialogHeader>
        <div>
          <Label htmlFor="reason" className="text-xs">Motivo (opcional)</Label>
          <Textarea
            id="reason"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Ex.: cliente desistiu"
            rows={3}
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
            Voltar
          </Button>
          <Button variant="destructive" onClick={() => onConfirm(reason)} disabled={submitting}>
            {submitting ? "Cancelando..." : "Confirmar cancelamento"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function SummaryDialog({ summary, onClose }: { summary: FinalSummary | null; onClose: () => void }) {
  return (
    <Dialog open={!!summary} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-primary" /> Locação finalizada
          </DialogTitle>
          <DialogDescription>Resumo da operação</DialogDescription>
        </DialogHeader>
        {summary && (
          <div className="space-y-2 text-sm">
            <Row label="Veículo" value={summary.vehicleName} />
            <Row label="Horário inicial" value={timeBR(summary.startedAt)} />
            <Row label="Horário final" value={timeBR(summary.endedAt)} />
            <div className="border-t my-2" />
            <Row label="Tempo inicial" value={fmtMinutes(summary.initialMinutes)} />
            <Row label="Tempo renovado" value={fmtMinutes(summary.renewedMinutes)} />
            <Row label="Duração total" value={fmtMinutes(summary.totalMinutes)} bold />
            <div className="border-t my-2" />
            <Row label="Valor inicial" value={currency(summary.initialAmount)} />
            <Row label="Valor das renovações" value={currency(summary.renewalsAmount)} />
            <Row label="Valor total" value={currency(summary.totalAmount)} bold />
          </div>
        )}
        <DialogFooter>
          <Button onClick={onClose} className="w-full">Fechar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Row({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div className="flex justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span className={bold ? "font-bold" : "font-medium"}>{value}</span>
    </div>
  );
}

function VehiclePhoto({ path, name, size }: { path: string | null; name: string; size: string }) {
  const src = useVehiclePhotoUrl(path);
  if (src) return <img loading="lazy" decoding="async" src={src} alt={name} className={`${size} object-cover shrink-0`} />;
  return <div className={`${size} bg-muted grid place-items-center text-3xl shrink-0`}>🚗</div>;
}
