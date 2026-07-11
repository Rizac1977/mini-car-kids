import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Loader2, CheckCircle2, Calendar, AlertCircle, Clock, Ban, XCircle } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/app/assinatura")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Assinatura — MiniCar Gestão" },
      { name: "description", content: "Consulte a situação da sua assinatura na plataforma." },
    ],
  }),
  component: AssinaturaPage,
});

const dateBR = (d: string | Date) =>
  new Date(d).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });

type Sub = {
  id: string;
  plan: string;
  status: "trial" | "ativa" | "inadimplente" | "cancelada";
  started_at: string;
  current_period_end: string;
  notes: string | null;
};

const statusVisual: Record<Sub["status"], { title: string; icon: React.ElementType; grad: string }> = {
  trial: { title: "Período de teste", icon: Clock, grad: "from-accent to-[oklch(0.68_0.16_60)]" },
  ativa: { title: "Assinatura ativa", icon: CheckCircle2, grad: "from-primary to-[oklch(0.42_0.12_168)]" },
  inadimplente: { title: "Pagamento pendente", icon: AlertCircle, grad: "from-warning to-[oklch(0.60_0.16_60)]" },
  cancelada: { title: "Assinatura cancelada", icon: XCircle, grad: "from-destructive to-[oklch(0.45_0.20_28)]" },
};

function AssinaturaPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["subscription"],
    queryFn: async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) throw new Error("Sessão inválida");
      const { data: sub, error } = await supabase
        .from("subscriptions")
        .select("*")
        .eq("user_id", u.user.id)
        .maybeSingle();
      if (error) throw error;
      return sub as Sub | null;
    },
  });

  if (isLoading) {
    return (
      <AppShell title="Assinatura">
        <div className="flex justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
      </AppShell>
    );
  }

  if (!data) {
    return (
      <AppShell title="Assinatura">
        <Card className="p-6 text-center space-y-3">
          <Ban className="h-8 w-8 mx-auto text-muted-foreground" />
          <div className="font-semibold">Sem assinatura</div>
          <div className="text-sm text-muted-foreground">
            Nenhum plano ativo. Fale com o administrador da plataforma.
          </div>
        </Card>
      </AppShell>
    );
  }

  const visual = statusVisual[data.status];
  const Icon = visual.icon;
  const daysLeft = Math.ceil((new Date(data.current_period_end).getTime() - Date.now()) / 86400000);
  const overdue = daysLeft < 0;

  return (
    <AppShell title="Assinatura">
      <div className="space-y-4">
        <Card className={`p-6 bg-gradient-to-br ${visual.grad} text-primary-foreground`}>
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="text-sm opacity-80">Plano atual</div>
              <div className="text-2xl font-bold">{visual.title}</div>
              <div className="text-xs opacity-80 mt-1 capitalize">{data.plan}</div>
            </div>
            <Icon className="h-8 w-8" />
          </div>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between opacity-95">
              <span>Início</span>
              <span className="font-semibold">{dateBR(data.started_at)}</span>
            </div>
            <div className="flex justify-between opacity-95">
              <span>Vencimento</span>
              <span className="font-semibold">{dateBR(data.current_period_end)}</span>
            </div>
            <div className="flex justify-between text-base pt-2 border-t border-white/20 mt-2">
              <span>{overdue ? "Vencida há" : "Restam"}</span>
              <span className="font-bold">
                {Math.abs(daysLeft)} dia{Math.abs(daysLeft) === 1 ? "" : "s"}
              </span>
            </div>
          </div>
        </Card>

        {daysLeft <= 7 && data.status !== "cancelada" && (
          <Card className="p-4 border-warning/40 bg-warning/10">
            <div className="flex gap-3">
              <AlertCircle className="h-5 w-5 text-warning-foreground shrink-0 mt-0.5" />
              <div className="text-sm">
                <div className="font-semibold">
                  {overdue ? "Assinatura vencida" : "Assinatura próxima do vencimento"}
                </div>
                <div className="text-muted-foreground">Entre em contato para renovar.</div>
              </div>
            </div>
          </Card>
        )}

        <Card className="p-4">
          <h2 className="font-bold mb-3 text-sm">Histórico</h2>
          <div className="space-y-3 text-sm">
            <HistoryItem date={dateBR(data.started_at)} event={`Plano ${data.plan} iniciado`} />
          </div>
        </Card>

        {data.notes && (
          <Card className="p-4">
            <h2 className="font-bold mb-2 text-sm">Observações do administrador</h2>
            <p className="text-sm text-muted-foreground whitespace-pre-line">{data.notes}</p>
          </Card>
        )}

        <Button asChild className="w-full h-12 font-semibold">
          <a
            href="https://wa.me/5584998472400?text=Ol%C3%A1%2C%20preciso%20de%20suporte%20no%20MiniCar%20Gest%C3%A3o"
            target="_blank"
            rel="noopener noreferrer"
          >
            Falar com suporte
          </a>
        </Button>
      </div>
    </AppShell>
  );
}

function HistoryItem({ date, event }: { date: string; event: string }) {
  return (
    <div className="flex items-start gap-3">
      <Calendar className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
      <div>
        <div>{event}</div>
        <div className="text-xs text-muted-foreground">{date}</div>
      </div>
    </div>
  );
}
