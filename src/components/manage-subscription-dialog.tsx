import { useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Save } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  userId: string;
  current: {
    plan: string;
    status: string;
    current_period_end: string;
  } | null;
};

const PLANS = ["trial", "mensal", "anual"] as const;
const STATUSES = ["trial", "ativa", "inadimplente", "cancelada"] as const;
type SubStatus = (typeof STATUSES)[number];

function toDateInputValue(iso: string) {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function ManageSubscriptionDialog({ open, onOpenChange, userId, current }: Props) {
  const [plan, setPlan] = useState<string>(current?.plan ?? "trial");
  const [status, setStatus] = useState<string>(current?.status ?? "trial");
  const [endDate, setEndDate] = useState<string>(
    current ? toDateInputValue(current.current_period_end) : toDateInputValue(new Date().toISOString()),
  );
  const qc = useQueryClient();

  useEffect(() => {
    if (open && current) {
      setPlan(current.plan);
      setStatus(current.status);
      setEndDate(toDateInputValue(current.current_period_end));
    }
  }, [open, current]);

  function addDays(n: number) {
    const base = endDate ? new Date(endDate + "T23:59:59") : new Date();
    base.setDate(base.getDate() + n);
    setEndDate(toDateInputValue(base.toISOString()));
  }

  function endTrialNow() {
    setPlan("trial");
    setStatus("cancelada");
    setEndDate(toDateInputValue(new Date().toISOString()));
  }


  const save = useMutation({
    mutationFn: async () => {
      const { data: userData } = await supabase.auth.getUser();
      const adminId = userData.user?.id;
      if (!adminId) throw new Error("Sessão expirada");

      const endIso = new Date(endDate + "T23:59:59").toISOString();
      const payload = {
        plan,
        status: status as SubStatus,
        current_period_end: endIso,
      };

      const { data: existing } = await supabase
        .from("subscriptions")
        .select("id,plan,status,current_period_end")
        .eq("user_id", userId)
        .maybeSingle();

      if (existing) {
        const { error } = await supabase
          .from("subscriptions")
          .update(payload)
          .eq("user_id", userId);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("subscriptions")
          .insert({ user_id: userId, ...payload });
        if (error) throw error;
      }

      await supabase.from("administrative_logs").insert({
        administrator_id: adminId,
        affected_user_id: userId,
        action: "Assinatura atualizada",
        previous_data: existing
          ? {
              plan: existing.plan,
              status: existing.status,
              current_period_end: existing.current_period_end,
            }
          : null,
        new_data: payload,
      });
    },
    onSuccess: () => {
      toast.success("Assinatura atualizada");
      void qc.invalidateQueries({ queryKey: ["admin"] });
      onOpenChange(false);
    },
    onError: (e: Error) => toast.error(e.message || "Erro ao salvar"),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Gerenciar assinatura</DialogTitle>
          <DialogDescription>Ajuste plano, situação e vencimento.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label>Plano</Label>
            <div className="flex flex-wrap gap-2">
              {PLANS.map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setPlan(p)}
                  className={`px-3 h-9 rounded-full text-xs font-medium capitalize border ${
                    plan === p
                      ? "bg-foreground text-background border-foreground"
                      : "bg-card text-foreground border-border"
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label>Situação</Label>
            <div className="flex flex-wrap gap-2">
              {STATUSES.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setStatus(s)}
                  className={`px-3 h-9 rounded-full text-xs font-medium capitalize border ${
                    status === s
                      ? "bg-foreground text-background border-foreground"
                      : "bg-card text-foreground border-border"
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="end-date">Vencimento</Label>
            <Input
              id="end-date"
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="h-11"
            />
            <div className="flex flex-wrap gap-2">
              {[7, 15, 30, 90].map((n) => (
                <button
                  key={`plus-${n}`}
                  type="button"
                  onClick={() => addDays(n)}
                  className="px-3 h-8 rounded-full text-xs font-medium border bg-card text-foreground border-border"
                >
                  +{n} dias
                </button>
              ))}
              {[7, 15, 30].map((n) => (
                <button
                  key={`minus-${n}`}
                  type="button"
                  onClick={() => addDays(-n)}
                  className="px-3 h-8 rounded-full text-xs font-medium border bg-card text-foreground border-border"
                >
                  −{n} dias
                </button>
              ))}
            </div>
          </div>

          {plan === "trial" ? (
            <div className="rounded-lg border border-border bg-muted/40 p-3 space-y-2">
              <div className="text-xs font-semibold">Período de avaliação</div>
              <p className="text-xs text-muted-foreground">
                Ajuste rapidamente os dias de teste ou encerre a avaliação agora.
              </p>
              <div className="flex flex-wrap gap-2">
                {[1, 3, 7, 15].map((n) => (
                  <button
                    key={`trial-plus-${n}`}
                    type="button"
                    onClick={() => addDays(n)}
                    className="px-3 h-8 rounded-full text-xs font-medium border bg-card text-foreground border-border"
                  >
                    +{n} dias de avaliação
                  </button>
                ))}
                <button
                  type="button"
                  onClick={endTrialNow}
                  className="px-3 h-8 rounded-full text-xs font-semibold border bg-destructive text-destructive-foreground border-destructive"
                >
                  Encerrar avaliação agora
                </button>
              </div>
            </div>
          ) : null}

        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={save.isPending}>
            Cancelar
          </Button>
          <Button className="gap-1" onClick={() => save.mutate()} disabled={save.isPending}>
            <Save className="h-4 w-4" /> Salvar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
