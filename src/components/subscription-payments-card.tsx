import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { DollarSign, Plus, Save, Trash2, Calendar, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { currency } from "@/lib/mock-data";

type Payment = {
  id: string;
  paid_at: string;
  amount: number;
  period_start: string;
  period_end: string;
  payment_method: string | null;
  notes: string | null;
  created_at: string;
};

function todayISO() {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function addMonths(iso: string, months: number) {
  const d = new Date(iso + "T00:00:00");
  d.setMonth(d.getMonth() + months);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

const dateBR = (iso: string) =>
  new Date(iso + (iso.length === 10 ? "T00:00:00" : "")).toLocaleDateString("pt-BR");

export function SubscriptionPaymentsCard({
  userId,
  currentPeriodEnd,
}: {
  userId: string;
  currentPeriodEnd?: string | null;
}) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [paidAt, setPaidAt] = useState(todayISO());
  const [amount, setAmount] = useState("");
  const [months, setMonths] = useState<number>(1);
  const [method, setMethod] = useState("Pix");
  const [notes, setNotes] = useState("");
  const [extend, setExtend] = useState(true);

  const { data, isLoading } = useQuery({
    queryKey: ["admin", "payments", userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("subscription_payments")
        .select("id,paid_at,amount,period_start,period_end,payment_method,notes,created_at")
        .eq("user_id", userId)
        .order("paid_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Payment[];
    },
  });

  const periodStart = useMemo(() => {
    // period starts at the later of: today or current subscription end
    if (currentPeriodEnd) {
      const end = new Date(currentPeriodEnd);
      const now = new Date();
      const base = end > now ? end : now;
      const pad = (n: number) => String(n).padStart(2, "0");
      return `${base.getFullYear()}-${pad(base.getMonth() + 1)}-${pad(base.getDate())}`;
    }
    return paidAt;
  }, [currentPeriodEnd, paidAt]);

  const periodEnd = useMemo(() => addMonths(periodStart, months), [periodStart, months]);

  const save = useMutation({
    mutationFn: async () => {
      const { data: userData } = await supabase.auth.getUser();
      const adminId = userData.user?.id;
      if (!adminId) throw new Error("Sessão expirada");

      const value = Number(String(amount).replace(",", "."));
      if (!Number.isFinite(value) || value < 0) throw new Error("Valor inválido");

      const { error } = await supabase.from("subscription_payments").insert({
        user_id: userId,
        paid_at: paidAt,
        amount: value,
        period_start: periodStart,
        period_end: periodEnd,
        payment_method: method || null,
        notes: notes || null,
        created_by: adminId,
      });
      if (error) throw error;

      if (extend) {
        const endIso = new Date(periodEnd + "T23:59:59").toISOString();
        const { data: existing } = await supabase
          .from("subscriptions")
          .select("id,plan,status,current_period_end")
          .eq("user_id", userId)
          .maybeSingle();
        const payload = {
          plan: existing?.plan && existing.plan !== "trial" ? existing.plan : "mensal",
          status: "ativa" as const,
          current_period_end: endIso,
        };
        if (existing) {
          await supabase.from("subscriptions").update(payload).eq("user_id", userId);
        } else {
          await supabase.from("subscriptions").insert({ user_id: userId, ...payload });
        }
      }

      await supabase.from("administrative_logs").insert({
        administrator_id: adminId,
        affected_user_id: userId,
        action: "Pagamento registrado",
        new_data: {
          paid_at: paidAt,
          amount: value,
          period_start: periodStart,
          period_end: periodEnd,
          payment_method: method || null,
          extended: extend,
        },
      });
    },
    onSuccess: () => {
      toast.success("Pagamento registrado");
      setOpen(false);
      setAmount("");
      setNotes("");
      void qc.invalidateQueries({ queryKey: ["admin", "payments", userId] });
      void qc.invalidateQueries({ queryKey: ["admin", "dono", userId, "sub"] });
      void qc.invalidateQueries({ queryKey: ["admin-dashboard"] });
      void qc.invalidateQueries({ queryKey: ["admin", "vencimentos"] });
    },
    onError: (e: Error) => toast.error(e.message || "Erro ao salvar"),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("subscription_payments").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Pagamento removido");
      void qc.invalidateQueries({ queryKey: ["admin", "payments", userId] });
    },
    onError: (e: Error) => toast.error(e.message || "Erro ao remover"),
  });

  const total = (data ?? []).reduce((s, p) => s + Number(p.amount), 0);

  return (
    <Card className="p-4 space-y-3">
      <div className="flex items-center justify-between gap-2">
        <div className="font-semibold text-sm flex items-center gap-2">
          <DollarSign className="h-4 w-4" /> Pagamentos da assinatura
        </div>
        <Button size="sm" className="h-8 gap-1" onClick={() => setOpen(true)}>
          <Plus className="h-3.5 w-3.5" /> Registrar
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-2 text-center">
        <div className="rounded-md bg-muted/40 p-2">
          <div className="text-xs text-muted-foreground">Total recebido</div>
          <div className="font-bold">{currency(total)}</div>
        </div>
        <div className="rounded-md bg-muted/40 p-2">
          <div className="text-xs text-muted-foreground">Pagamentos</div>
          <div className="font-bold">{data?.length ?? 0}</div>
        </div>
      </div>

      {isLoading ? (
        <div className="py-6 grid place-items-center text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
        </div>
      ) : (data ?? []).length === 0 ? (
        <div className="text-xs text-muted-foreground text-center py-3">
          Nenhum pagamento registrado.
        </div>
      ) : (
        <div className="space-y-2">
          {(data ?? []).map((p) => (
            <div
              key={p.id}
              className="flex items-start justify-between gap-2 rounded-lg border p-3 text-sm"
            >
              <div className="min-w-0">
                <div className="font-semibold">{currency(Number(p.amount))}</div>
                <div className="text-xs text-muted-foreground flex items-center gap-1">
                  <Calendar className="h-3 w-3" /> Pago em {dateBR(p.paid_at)}
                </div>
                <div className="text-xs text-muted-foreground">
                  Período: {dateBR(p.period_start)} → {dateBR(p.period_end)}
                </div>
                <div className="mt-1 flex flex-wrap gap-1">
                  {p.payment_method && (
                    <Badge variant="outline" className="text-[10px]">
                      {p.payment_method}
                    </Badge>
                  )}
                </div>
                {p.notes && (
                  <div className="text-xs text-muted-foreground mt-1">{p.notes}</div>
                )}
              </div>
              <button
                type="button"
                onClick={() => {
                  if (confirm("Remover este pagamento?")) remove.mutate(p.id);
                }}
                className="text-muted-foreground hover:text-destructive p-1"
                aria-label="Remover"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Registrar pagamento</DialogTitle>
            <DialogDescription>
              Uso interno do administrador — o dono só verá o histórico dos pagamentos.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2">
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1.5">
                <Label htmlFor="paid-at" className="text-xs">Data do pagamento</Label>
                <Input
                  id="paid-at"
                  type="date"
                  value={paidAt}
                  onChange={(e) => setPaidAt(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="amount" className="text-xs">Valor (R$)</Label>
                <Input
                  id="amount"
                  type="text"
                  inputMode="decimal"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="99,90"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Meses cobertos</Label>
              <div className="flex flex-wrap gap-2">
                {[1, 3, 6, 12].map((n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setMonths(n)}
                    className={`px-3 h-8 rounded-full text-xs font-medium border ${
                      months === n
                        ? "bg-foreground text-background border-foreground"
                        : "bg-card text-foreground border-border"
                    }`}
                  >
                    {n} {n === 1 ? "mês" : "meses"}
                  </button>
                ))}
              </div>
              <div className="text-xs text-muted-foreground">
                Novo vencimento: <span className="font-semibold">{dateBR(periodEnd)}</span>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Forma de pagamento</Label>
              <div className="flex flex-wrap gap-2">
                {["Pix", "Dinheiro", "Cartão", "Boleto", "Outro"].map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setMethod(m)}
                    className={`px-3 h-8 rounded-full text-xs font-medium border ${
                      method === m
                        ? "bg-foreground text-background border-foreground"
                        : "bg-card text-foreground border-border"
                    }`}
                  >
                    {m}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="pay-notes" className="text-xs">Observações (opcional)</Label>
              <Textarea
                id="pay-notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
                placeholder="Ex.: pagamento antecipado, comprovante etc."
              />
            </div>

            <label className="flex items-center gap-2 text-xs pt-1">
              <input
                type="checkbox"
                checked={extend}
                onChange={(e) => setExtend(e.target.checked)}
                className="h-4 w-4"
              />
              Estender vencimento da assinatura para {dateBR(periodEnd)} e marcar como ativa
            </label>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setOpen(false)} disabled={save.isPending}>
              Cancelar
            </Button>
            <Button className="gap-1" onClick={() => save.mutate()} disabled={save.isPending || !amount}>
              <Save className="h-4 w-4" /> Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
