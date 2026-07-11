import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/app-shell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { subscription, dateBR } from "@/lib/mock-data";
import { CheckCircle2, Calendar, AlertCircle } from "lucide-react";

export const Route = createFileRoute("/app/assinatura")({
  head: () => ({
    meta: [
      { title: "Assinatura — MiniCar Gestão" },
      { name: "description", content: "Consulte a situação da sua assinatura na plataforma." },
    ],
  }),
  component: AssinaturaPage,
});

function AssinaturaPage() {
  const daysLeft = Math.ceil((subscription.expiration.getTime() - Date.now()) / 86400000);
  return (
    <AppShell title="Assinatura">
      <div className="space-y-4">
        <Card className="p-6 bg-gradient-to-br from-primary to-[oklch(0.42_0.12_168)] text-primary-foreground">
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="text-sm opacity-80">Plano atual</div>
              <div className="text-2xl font-bold">Assinatura Ativa</div>
            </div>
            <CheckCircle2 className="h-8 w-8" />
          </div>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between opacity-95">
              <span>Início</span>
              <span className="font-semibold">{dateBR(subscription.start)}</span>
            </div>
            <div className="flex justify-between opacity-95">
              <span>Vencimento</span>
              <span className="font-semibold">{dateBR(subscription.expiration)}</span>
            </div>
            <div className="flex justify-between text-base pt-2 border-t border-white/20 mt-2">
              <span>Restam</span>
              <span className="font-bold">{daysLeft} dias</span>
            </div>
          </div>
        </Card>

        {daysLeft <= 7 && (
          <Card className="p-4 border-warning/40 bg-warning/10">
            <div className="flex gap-3">
              <AlertCircle className="h-5 w-5 text-warning-foreground shrink-0 mt-0.5" />
              <div className="text-sm">
                <div className="font-semibold">Assinatura próxima do vencimento</div>
                <div className="text-muted-foreground">Entre em contato para renovar.</div>
              </div>
            </div>
          </Card>
        )}

        <Card className="p-4">
          <h2 className="font-bold mb-3">Histórico</h2>
          <div className="space-y-3 text-sm">
            {[
              { date: "15/11/2024", event: "Assinatura ativada" },
              { date: "15/11/2024", event: "Cadastro aprovado" },
            ].map((h) => (
              <div key={h.date + h.event} className="flex items-start gap-3">
                <Calendar className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                <div>
                  <div>{h.event}</div>
                  <div className="text-xs text-muted-foreground">{h.date}</div>
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Button className="w-full h-12 font-semibold">Falar com suporte</Button>
      </div>
    </AppShell>
  );
}
