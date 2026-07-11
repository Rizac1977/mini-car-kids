import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Clock, XCircle, Pause, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { BrandLogo } from "@/components/brand-logo";
import { supabase } from "@/integrations/supabase/client";
import { fetchProfileAndRole, routeForUser, signOut, type AccountStatus } from "@/hooks/use-auth";

export const Route = createFileRoute("/aguardando-aprovacao")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Aguardando aprovação — MiniCar Gestão" },
      { name: "description", content: "Sua conta está sendo revisada pelo administrador da plataforma." },
    ],
  }),
  component: AguardandoPage,
});

const messages: Record<AccountStatus, { icon: React.ElementType; title: string; body: string; tone: string }> = {
  pendente: {
    icon: Clock,
    title: "Aguardando aprovação",
    body: "Sua conta foi criada e está sendo revisada pelo administrador. Você receberá acesso completo assim que for aprovada.",
    tone: "bg-warning/15 text-warning-foreground",
  },
  suspenso: {
    icon: Pause,
    title: "Conta suspensa",
    body: "Sua conta foi temporariamente suspensa. Entre em contato com o administrador para mais informações.",
    tone: "bg-destructive/15 text-destructive",
  },
  recusado: {
    icon: XCircle,
    title: "Cadastro recusado",
    body: "Seu cadastro não foi aprovado. Entre em contato com o administrador se precisar de esclarecimentos.",
    tone: "bg-destructive/15 text-destructive",
  },
  ativo: {
    icon: Clock,
    title: "Verificando...",
    body: "",
    tone: "bg-muted",
  },
};

function AguardandoPage() {
  const [status, setStatus] = useState<AccountStatus | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getUser();
      if (!data.user) {
        navigate({ to: "/login" });
        return;
      }
      const { profile, role } = await fetchProfileAndRole(data.user.id);
      if (role === "platform_admin" || profile?.account_status === "ativo") {
        navigate({ to: routeForUser(role, profile?.account_status ?? null) });
        return;
      }
      setStatus(profile?.account_status ?? "pendente");
    })();
  }, [navigate]);

  const m = messages[status ?? "pendente"];
  const Icon = m.icon;

  return (
    <div className="min-h-screen bg-background flex flex-col justify-center px-6 py-10">
      <div className="w-full max-w-sm mx-auto">
        <div className="mb-8">
          <BrandLogo size="md" />
        </div>
        <Card className="p-6 text-center space-y-4">
          <div className={`inline-flex h-14 w-14 rounded-full items-center justify-center mx-auto ${m.tone}`}>
            <Icon className="h-7 w-7" />
          </div>
          <div>
            <h1 className="text-xl font-bold">{m.title}</h1>
            <p className="text-sm text-muted-foreground mt-2">{m.body}</p>
          </div>
          <Button
            variant="outline"
            className="w-full h-12 gap-2"
            onClick={async () => {
              await signOut();
              navigate({ to: "/login" });
            }}
          >
            <LogOut className="h-4 w-4" /> Sair
          </Button>
        </Card>
      </div>
    </div>
  );
}
