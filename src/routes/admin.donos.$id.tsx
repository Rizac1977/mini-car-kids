import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  ArrowLeft,
  Phone,
  MapPin,
  CheckCircle2,
  XCircle,
  Pause,
  Play,
  Loader2,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { dateBR } from "@/lib/mock-data";
import type { AccountStatus } from "@/hooks/use-auth";
import { AdminShell } from "./admin.index";

export const Route = createFileRoute("/admin/donos/$id")({
  head: ({ params }) => ({
    meta: [
      { title: `Dono — Admin` },
      { name: "description", content: `Detalhes do dono cadastrado.` },
    ],
  }),
  component: DonoDetailPage,
  notFoundComponent: () => (
    <div className="p-10 text-center text-muted-foreground">Dono não encontrado.</div>
  ),
  errorComponent: () => (
    <div className="p-10 text-center text-destructive">Erro ao carregar dono.</div>
  ),
});

type Profile = {
  id: string;
  user_id: string;
  full_name: string;
  business_name: string | null;
  phone: string | null;
  city: string | null;
  state: string | null;
  account_status: AccountStatus;
  created_at: string;
};

type LogRow = {
  id: string;
  action: string;
  new_data: Record<string, unknown> | null;
  created_at: string;
};

const statusStyle: Record<string, string> = {
  ativo: "bg-success/15 text-success border-success/30",
  pendente: "bg-warning/20 text-warning-foreground border-warning/40",
  suspenso: "bg-destructive/15 text-destructive border-destructive/30",
  recusado: "bg-destructive/15 text-destructive border-destructive/30",
};

function DonoDetailPage() {
  const { id: userId } = Route.useParams();
  const qc = useQueryClient();

  const { data: profile, isLoading } = useQuery({
    queryKey: ["admin", "dono", userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id,user_id,full_name,business_name,phone,city,state,account_status,created_at")
        .eq("user_id", userId)
        .maybeSingle();
      if (error) throw error;
      return data as Profile | null;
    },
  });

  const { data: logs } = useQuery({
    queryKey: ["admin", "dono", userId, "logs"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("administrative_logs")
        .select("id,action,new_data,created_at")
        .eq("affected_user_id", userId)
        .order("created_at", { ascending: false })
        .limit(20);
      if (error) throw error;
      return (data ?? []) as LogRow[];
    },
  });

  const changeStatus = useMutation({
    mutationFn: async (next: AccountStatus) => {
      if (!profile) throw new Error("Perfil não carregado");
      const { data: userData } = await supabase.auth.getUser();
      const adminId = userData.user?.id;
      if (!adminId) throw new Error("Sessão expirada");

      const { error } = await supabase
        .from("profiles")
        .update({ account_status: next })
        .eq("user_id", userId);
      if (error) throw error;

      const actionMap: Record<AccountStatus, string> = {
        ativo: "Cadastro aprovado",
        suspenso: "Conta suspensa",
        recusado: "Cadastro recusado",
        pendente: "Conta marcada como pendente",
      };

      await supabase.from("administrative_logs").insert({
        administrator_id: adminId,
        affected_user_id: userId,
        action: actionMap[next],
        previous_data: { account_status: profile.account_status },
        new_data: { account_status: next },
      });
    },
    onSuccess: (_r, next) => {
      toast.success(
        next === "ativo"
          ? "Dono aprovado com sucesso"
          : next === "suspenso"
            ? "Conta suspensa"
            : next === "recusado"
              ? "Cadastro recusado"
              : "Status atualizado"
      );
      void qc.invalidateQueries({ queryKey: ["admin", "dono", userId] });
      void qc.invalidateQueries({ queryKey: ["admin", "dono", userId, "logs"] });
      void qc.invalidateQueries({ queryKey: ["admin", "donos"] });
    },
    onError: (err: Error) => toast.error(err.message || "Erro ao atualizar status"),
  });

  if (isLoading) {
    return (
      <AdminShell title="Detalhes do dono">
        <div className="py-16 grid place-items-center text-muted-foreground">
          <Loader2 className="h-6 w-6 animate-spin" />
        </div>
      </AdminShell>
    );
  }

  if (!profile) {
    return (
      <AdminShell title="Detalhes do dono">
        <Card className="p-8 text-center text-sm text-muted-foreground">
          Dono não encontrado.
        </Card>
      </AdminShell>
    );
  }

  const status = profile.account_status;
  const pending = changeStatus.isPending;

  return (
    <AdminShell title="Detalhes do dono">
      <Link
        to="/admin/donos"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground mb-4"
      >
        <ArrowLeft className="h-4 w-4" /> Voltar
      </Link>

      <Card className="p-5 mb-4">
        <div className="flex items-start gap-4">
          <div className="h-14 w-14 rounded-full bg-primary text-primary-foreground grid place-items-center font-bold text-lg shrink-0">
            {profile.full_name
              .split(" ")
              .map((n) => n[0])
              .slice(0, 2)
              .join("")
              .toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-bold text-lg truncate">{profile.full_name}</div>
            {profile.business_name && (
              <div className="text-sm text-muted-foreground truncate">
                {profile.business_name}
              </div>
            )}
            <div className="mt-2 flex flex-wrap gap-2">
              <Badge
                variant="outline"
                className={`${statusStyle[status] ?? "bg-muted"} capitalize`}
              >
                {status}
              </Badge>
            </div>
          </div>
        </div>
        <div className="mt-4 pt-4 border-t space-y-2 text-sm">
          {profile.phone && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Phone className="h-4 w-4" /> {profile.phone}
            </div>
          )}
          {(profile.city || profile.state) && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <MapPin className="h-4 w-4" />
              {[profile.city, profile.state].filter(Boolean).join("/")}
            </div>
          )}
          <div className="text-xs text-muted-foreground">
            Cadastro em {dateBR(profile.created_at)}
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-3 gap-2 mb-4">
        {status !== "ativo" && (
          <Button
            variant="outline"
            className="h-11 gap-1 text-success border-success/40 col-span-3"
            disabled={pending}
            onClick={() => changeStatus.mutate("ativo")}
          >
            <CheckCircle2 className="h-4 w-4" />
            {status === "pendente" ? "Aprovar cadastro" : "Reativar conta"}
          </Button>
        )}
        {status === "ativo" && (
          <Button
            variant="outline"
            className="h-11 gap-1 text-warning-foreground border-warning/40 col-span-3"
            disabled={pending}
            onClick={() => changeStatus.mutate("suspenso")}
          >
            <Pause className="h-4 w-4" /> Suspender conta
          </Button>
        )}
        {status === "suspenso" && (
          <Button
            variant="outline"
            className="h-11 gap-1 col-span-3"
            disabled={pending}
            onClick={() => changeStatus.mutate("pendente")}
          >
            <Play className="h-4 w-4" /> Voltar para pendente
          </Button>
        )}
        {status === "pendente" && (
          <Button
            variant="outline"
            className="h-11 gap-1 text-destructive border-destructive/40 col-span-3"
            disabled={pending}
            onClick={() => changeStatus.mutate("recusado")}
          >
            <XCircle className="h-4 w-4" /> Recusar cadastro
          </Button>
        )}
        {status === "recusado" && (
          <Button
            variant="outline"
            className="h-11 gap-1 col-span-3"
            disabled={pending}
            onClick={() => changeStatus.mutate("pendente")}
          >
            <Play className="h-4 w-4" /> Reavaliar cadastro
          </Button>
        )}
      </div>

      <Tabs defaultValue="log">
        <TabsList className="w-full grid grid-cols-2 h-auto">
          <TabsTrigger value="log" className="text-xs py-2">
            Histórico de ações
          </TabsTrigger>
          <TabsTrigger value="info" className="text-xs py-2">
            Informações
          </TabsTrigger>
        </TabsList>

        <TabsContent value="log" className="mt-4 space-y-2">
          {(logs ?? []).length === 0 ? (
            <Card className="p-4 text-sm text-muted-foreground text-center">
              Nenhuma ação registrada ainda.
            </Card>
          ) : (
            (logs ?? []).map((l) => (
              <Card key={l.id} className="p-3 text-sm">
                <div className="font-medium">{l.action}</div>
                <div className="text-xs text-muted-foreground">
                  {new Date(l.created_at).toLocaleString("pt-BR")}
                </div>
              </Card>
            ))
          )}
        </TabsContent>

        <TabsContent value="info" className="mt-4 space-y-2">
          <Card className="p-4 text-sm space-y-2">
            <Line label="Nome" value={profile.full_name} />
            <Line label="Negócio" value={profile.business_name ?? "—"} />
            <Line label="Telefone" value={profile.phone ?? "—"} />
            <Line
              label="Localização"
              value={[profile.city, profile.state].filter(Boolean).join("/") || "—"}
            />
            <Line label="Status" value={status} capitalize />
          </Card>
        </TabsContent>
      </Tabs>
    </AdminShell>
  );
}

function Line({
  label,
  value,
  capitalize,
}: {
  label: string;
  value: string;
  capitalize?: boolean;
}) {
  return (
    <div className="flex justify-between gap-2">
      <span className="text-muted-foreground">{label}</span>
      <span className={capitalize ? "capitalize" : ""}>{value}</span>
    </div>
  );
}
