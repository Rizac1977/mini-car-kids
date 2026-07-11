import { createFileRoute, Link } from "@tanstack/react-router";
import { AppShell } from "@/components/app-shell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { owner, dateBR } from "@/lib/mock-data";
import { Mail, Phone, MapPin, Calendar, Shield, LogOut, CreditCard, ChevronRight } from "lucide-react";

export const Route = createFileRoute("/app/perfil")({
  head: () => ({
    meta: [
      { title: "Perfil — MiniCar Gestão" },
      { name: "description", content: "Gerencie suas informações pessoais e da conta." },
    ],
  }),
  component: PerfilPage,
});

function PerfilPage() {
  return (
    <AppShell title="Perfil">
      <div className="space-y-4">
        <Card className="p-6 flex flex-col items-center text-center">
          <div className="h-20 w-20 rounded-full bg-primary text-primary-foreground grid place-items-center text-2xl font-bold mb-3">
            CS
          </div>
          <div className="font-bold text-lg">{owner.name}</div>
          <div className="text-sm text-muted-foreground">{owner.business}</div>
          <div className="mt-2 inline-flex items-center gap-1 px-3 py-1 rounded-full bg-success/15 text-success text-xs font-semibold">
            <Shield className="h-3 w-3" /> Conta ativa
          </div>
        </Card>

        <Card className="p-4 space-y-3 text-sm">
          <Row icon={Mail} label={owner.email} />
          <Row icon={Phone} label={owner.phone} />
          <Row icon={MapPin} label={`${owner.city} / ${owner.state}`} />
          <Row icon={Calendar} label={`Na plataforma desde ${dateBR(owner.joined)}`} />
        </Card>

        <Link to="/app/assinatura">
          <Card className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-accent/20 grid place-items-center">
              <CreditCard className="h-5 w-5 text-accent-foreground" />
            </div>
            <div className="flex-1">
              <div className="font-semibold text-sm">Minha assinatura</div>
              <div className="text-xs text-muted-foreground">Ativa · vence em 22 dias</div>
            </div>
            <ChevronRight className="h-5 w-5 text-muted-foreground" />
          </Card>
        </Link>

        <Button variant="outline" className="w-full h-12">Editar perfil</Button>

        <Link to="/login">
          <Button variant="ghost" className="w-full h-12 gap-2 text-destructive hover:text-destructive">
            <LogOut className="h-4 w-4" /> Sair da conta
          </Button>
        </Link>
      </div>
    </AppShell>
  );
}

function Row({ icon: Icon, label }: { icon: React.ElementType; label: string }) {
  return (
    <div className="flex items-center gap-3">
      <Icon className="h-4 w-4 text-muted-foreground shrink-0" />
      <span className="truncate">{label}</span>
    </div>
  );
}
