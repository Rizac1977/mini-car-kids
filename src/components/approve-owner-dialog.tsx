import { useState } from "react";
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
import { CheckCircle2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  userId: string;
  ownerName?: string;
  onApproved?: () => void;
};

export function ApproveOwnerDialog({ open, onOpenChange, userId, ownerName, onApproved }: Props) {
  const [days, setDays] = useState<number>(3);
  const qc = useQueryClient();

  const approve = useMutation({
    mutationFn: async () => {
      const n = Math.max(1, Math.min(365, Math.floor(days || 3)));
      const { data: userData } = await supabase.auth.getUser();
      const adminId = userData.user?.id;
      if (!adminId) throw new Error("Sessão expirada");

      const { error: pErr } = await supabase
        .from("profiles")
        .update({ account_status: "ativo" })
        .eq("user_id", userId);
      if (pErr) throw pErr;

      const trialEnd = new Date(Date.now() + n * 86400000).toISOString();
      const { data: existing } = await supabase
        .from("subscriptions")
        .select("id")
        .eq("user_id", userId)
        .maybeSingle();

      if (existing) {
        const { error } = await supabase
          .from("subscriptions")
          .update({
            plan: "trial",
            status: "trial",
            started_at: new Date().toISOString(),
            current_period_end: trialEnd,
          })
          .eq("user_id", userId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("subscriptions").insert({
          user_id: userId,
          plan: "trial",
          status: "trial",
          current_period_end: trialEnd,
        });
        if (error) throw error;
      }

      await supabase.from("administrative_logs").insert({
        administrator_id: adminId,
        affected_user_id: userId,
        action: `Cadastro aprovado com ${n} dia${n > 1 ? "s" : ""} de teste`,
        new_data: { account_status: "ativo", trial_days: n, trial_ends_at: trialEnd },
      });

      return n;
    },
    onSuccess: (n) => {
      toast.success(`Dono aprovado — ${n} dia${n > 1 ? "s" : ""} de teste liberado${n > 1 ? "s" : ""}`);
      void qc.invalidateQueries({ queryKey: ["admin"] });
      onOpenChange(false);
      onApproved?.();
    },
    onError: (e: Error) => toast.error(e.message || "Erro ao aprovar"),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Aprovar cadastro</DialogTitle>
          <DialogDescription>
            {ownerName ? `${ownerName} — defina` : "Defina"} o período de teste gratuito.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3 py-2">
          <Label htmlFor="trial-days">Dias de teste</Label>
          <Input
            id="trial-days"
            type="number"
            min={1}
            max={365}
            value={days}
            onChange={(e) => setDays(Number(e.target.value))}
            className="h-11"
          />
          <div className="flex flex-wrap gap-2">
            {[3, 7, 14, 30].map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => setDays(n)}
                className={`px-3 h-8 rounded-full text-xs font-medium border ${
                  days === n
                    ? "bg-foreground text-background border-foreground"
                    : "bg-card text-foreground border-border"
                }`}
              >
                {n} dias
              </button>
            ))}
          </div>
          <p className="text-xs text-muted-foreground">
            Após aprovação, o dono terá acesso completo pelo período escolhido.
          </p>
        </div>
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={approve.isPending}>
            Cancelar
          </Button>
          <Button
            className="gap-1"
            onClick={() => approve.mutate()}
            disabled={approve.isPending || !days || days < 1}
          >
            <CheckCircle2 className="h-4 w-4" /> Aprovar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
