import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
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
  Car,
  Timer,
  DollarSign,
  Calendar,
  Mail,
  User as UserIcon,
  Settings,
  Save,
  BarChart3,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { dateBR, currency } from "@/lib/mock-data";
import type { AccountStatus } from "@/hooks/use-auth";
import { AdminShell } from "./admin.index";
import { ApproveOwnerDialog } from "@/components/approve-owner-dialog";
import { ManageSubscriptionDialog } from "@/components/manage-subscription-dialog";

export const Route = createFileRoute("/admin/donos/$id")({
  head: () => ({
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
  profile_photo_url: string | null;
  account_status: AccountStatus;
  admin_notes: string | null;
  created_at: string;
};

type LogRow = {
  id: string;
  action: string;
  new_data: Record<string, unknown> | null;
  created_at: string;
};

type Sub = {
  plan: string;
  status: string;
  started_at: string;
  current_period_end: string;
};

type Vehicle = {
  id: string;
  name: string;
  status: string;
  photo_url: string | null;
  created_at: string;
};

type Rental = {
  id: string;
  status: string;
  amount: number | null;
  planned_minutes: number | null;
  started_at: string;
  ended_at: string | null;
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
  const [approveOpen, setApproveOpen] = useState(false);
  const [manageOpen, setManageOpen] = useState(false);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [notes, setNotes] = useState("");

  const { data: profile, isLoading } = useQuery({
    queryKey: ["admin", "dono", userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select(
          "id,user_id,full_name,business_name,phone,city,state,profile_photo_url,account_status,admin_notes,created_at"
        )
        .eq("user_id", userId)
        .maybeSingle();
      if (error) throw error;
      return data as Profile | null;
    },
  });

  const { data: sub } = useQuery({
    queryKey: ["admin", "dono", userId, "sub"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("subscriptions")
        .select("plan,status,started_at,current_period_end")
        .eq("user_id", userId)
        .maybeSingle();
      if (error) throw error;
      return (data ?? null) as Sub | null;
    },
  });

  const { data: vehicles } = useQuery({
    queryKey: ["admin", "dono", userId, "vehicles"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("vehicles")
        .select("id,name,status,photo_url,created_at")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Vehicle[];
    },
  });

  const { data: rentals } = useQuery({
    queryKey: ["admin", "dono", userId, "rentals"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("rentals")
        .select("id,status,amount,planned_minutes,started_at,ended_at")
        .eq("user_id", userId)
        .order("started_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Rental[];
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

  useEffect(() => {
    let active = true;
    (async () => {
      if (!profile?.profile_photo_url) {
        setPhotoUrl(null);
        return;
      }
      const { data } = await supabase.storage
        .from("profile-photos")
        .createSignedUrl(profile.profile_photo_url, 3600);
      if (active) setPhotoUrl(data?.signedUrl ?? null);
    })();
    return () => {
      active = false;
    };
  }, [profile?.profile_photo_url]);

  useEffect(() => {
    if (profile) setNotes(profile.admin_notes ?? "");
  }, [profile]);

  const saveNotes = useMutation({
    mutationFn: async () => {
      const { data: userData } = await supabase.auth.getUser();
      const adminId = userData.user?.id;
      if (!adminId) throw new Error("Sessão expirada");
      const { error } = await supabase
        .from("profiles")
        .update({ admin_notes: notes || null })
        .eq("user_id", userId);
      if (error) throw error;
      await supabase.from("administrative_logs").insert({
        administrator_id: adminId,
        affected_user_id: userId,
        action: "Observações atualizadas",
        previous_data: { admin_notes: profile?.admin_notes ?? null },
        new_data: { admin_notes: notes || null },
      });
    },
    onSuccess: () => {
      toast.success("Observações salvas");
      void qc.invalidateQueries({ queryKey: ["admin", "dono", userId] });
      void qc.invalidateQueries({ queryKey: ["admin", "dono", userId, "logs"] });
    },
    onError: (e: Error) => toast.error(e.message || "Erro ao salvar"),
  });

  const stats = useMemo(() => {
    const list = rentals ?? [];
    const finalized = list.filter((r) => r.status === "finalizada");
    const active = list.filter((r) => r.status === "ativa").length;
    const revenue = finalized.reduce((s, r) => s + Number(r.amount ?? 0), 0);
    return {
      totalRentals: list.length,
      finalized: finalized.length,
      active,
      revenue,
    };
  }, [rentals]);

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
        ativo: "Conta reativada",
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
    onSuccess: () => {
      toast.success("Status atualizado");
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
  const subDaysLeft = sub
    ? Math.max(
        0,
        Math.ceil((new Date(sub.current_period_end).getTime() - Date.now()) / 86400000)
      )
    : 0;

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
          {photoUrl ? (
            <img
              src={photoUrl}
              alt={profile.full_name}
              className="h-16 w-16 rounded-full object-cover shrink-0"
            />
          ) : (
            <div className="h-16 w-16 rounded-full bg-primary text-primary-foreground grid place-items-center font-bold text-lg shrink-0">
              {profile.full_name
                .split(" ")
                .map((n) => n[0])
                .slice(0, 2)
                .join("")
                .toUpperCase()}
            </div>
          )}
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
              {sub && (
                <Badge variant="outline" className="capitalize">
                  {sub.plan} · {sub.status}
                </Badge>
              )}
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
          <div className="flex items-center gap-2 text-muted-foreground">
            <Calendar className="h-4 w-4" /> Cadastro em {dateBR(profile.created_at)}
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-2 gap-2 mb-4">
        <StatCard icon={Car} label="Veículos" value={String(vehicles?.length ?? 0)} />
        <StatCard icon={Timer} label="Locações" value={String(stats.totalRentals)} />
        <StatCard icon={DollarSign} label="Faturamento" value={currency(stats.revenue)} />
        <StatCard
          icon={Calendar}
          label="Teste restante"
          value={sub ? `${subDaysLeft} dia${subDaysLeft === 1 ? "" : "s"}` : "—"}
        />
      </div>

      <div className="grid grid-cols-1 gap-2 mb-4">
        {status === "pendente" && (
          <>
            <Button
              className="h-11 gap-1"
              disabled={pending}
              onClick={() => setApproveOpen(true)}
            >
              <CheckCircle2 className="h-4 w-4" /> Aprovar cadastro
            </Button>
            <Button
              variant="outline"
              className="h-11 gap-1 text-destructive border-destructive/40"
              disabled={pending}
              onClick={() => changeStatus.mutate("recusado")}
            >
              <XCircle className="h-4 w-4" /> Recusar cadastro
            </Button>
          </>
        )}
        {status === "ativo" && (
          <Button
            variant="outline"
            className="h-11 gap-1 text-warning-foreground border-warning/40"
            disabled={pending}
            onClick={() => changeStatus.mutate("suspenso")}
          >
            <Pause className="h-4 w-4" /> Suspender conta
          </Button>
        )}
        {status === "suspenso" && (
          <Button
            className="h-11 gap-1"
            disabled={pending}
            onClick={() => changeStatus.mutate("ativo")}
          >
            <Play className="h-4 w-4" /> Reativar conta
          </Button>
        )}
        {status === "recusado" && (
          <Button
            variant="outline"
            className="h-11 gap-1"
            disabled={pending}
            onClick={() => changeStatus.mutate("pendente")}
          >
            <Play className="h-4 w-4" /> Reavaliar cadastro
          </Button>
        )}
        {status !== "pendente" && (
          <Button
            variant="outline"
            className="h-11 gap-1"
            onClick={() => setManageOpen(true)}
          >
            <Settings className="h-4 w-4" /> Gerenciar assinatura
          </Button>
        )}
      </div>

      <Tabs defaultValue="info">
        <TabsList className="w-full grid grid-cols-6 h-auto">
          <TabsTrigger value="info" className="text-[10px] py-2">Visão geral</TabsTrigger>
          <TabsTrigger value="assinatura" className="text-[10px] py-2">Assinatura</TabsTrigger>
          <TabsTrigger value="veiculos" className="text-[10px] py-2">Veículos</TabsTrigger>
          <TabsTrigger value="locacoes" className="text-[10px] py-2">Locações</TabsTrigger>
          <TabsTrigger value="relatorios" className="text-[10px] py-2">Relatórios</TabsTrigger>
          <TabsTrigger value="log" className="text-[10px] py-2">Histórico</TabsTrigger>
        </TabsList>

        <TabsContent value="info" className="mt-4 space-y-2">
          <Card className="p-4 text-sm space-y-2">
            <div className="font-semibold text-sm mb-1">Dados do negócio</div>
            <Line icon={UserIcon} label="Nome" value={profile.full_name} />
            <Line icon={Mail} label="Negócio" value={profile.business_name ?? "—"} />
            <Line icon={Phone} label="Telefone" value={profile.phone ?? "—"} />
            <Line
              icon={MapPin}
              label="Localização"
              value={[profile.city, profile.state].filter(Boolean).join("/") || "—"}
            />
            <Line icon={CheckCircle2} label="Status" value={status} capitalize />
            <Line icon={Calendar} label="Cadastro" value={dateBR(profile.created_at)} />
          </Card>

          <Card className="p-4 text-sm space-y-2">
            <div className="flex items-center justify-between">
              <div className="font-semibold">Assinatura</div>
              <Button size="sm" variant="ghost" className="h-7 text-xs gap-1" onClick={() => setManageOpen(true)}>
                <Settings className="h-3.5 w-3.5" /> Gerenciar
              </Button>
            </div>
            {sub ? (
              <>
                <Line icon={CheckCircle2} label="Plano" value={sub.plan} capitalize />
                <Line icon={CheckCircle2} label="Situação" value={sub.status} capitalize />
                <Line
                  icon={Calendar}
                  label="Vence em"
                  value={`${dateBR(sub.current_period_end)} (${subDaysLeft} dia${subDaysLeft === 1 ? "" : "s"})`}
                />
              </>
            ) : (
              <div className="text-xs text-muted-foreground">Nenhuma assinatura registrada.</div>
            )}
          </Card>

          <Card className="p-4 text-sm space-y-2">
            <div className="font-semibold flex items-center gap-2">
              <DollarSign className="h-4 w-4" /> Faturamento do negócio
            </div>
            <div className="grid grid-cols-2 gap-2 text-center">
              <div className="rounded-md bg-muted/40 p-2">
                <div className="text-xs text-muted-foreground">Total arrecadado</div>
                <div className="font-bold">{currency(stats.revenue)}</div>
              </div>
              <div className="rounded-md bg-muted/40 p-2">
                <div className="text-xs text-muted-foreground">Ticket médio</div>
                <div className="font-bold">
                  {currency(stats.finalized > 0 ? stats.revenue / stats.finalized : 0)}
                </div>
              </div>
              <div className="rounded-md bg-muted/40 p-2">
                <div className="text-xs text-muted-foreground">Locações ativas</div>
                <div className="font-bold">{stats.active}</div>
              </div>
              <div className="rounded-md bg-muted/40 p-2">
                <div className="text-xs text-muted-foreground">Finalizadas</div>
                <div className="font-bold">{stats.finalized}</div>
              </div>
            </div>
          </Card>

          <Card className="p-4 space-y-2">
            <div className="font-semibold text-sm flex items-center gap-2">
              <Car className="h-4 w-4" /> Veículos cadastrados ({vehicles?.length ?? 0})
            </div>
            {(vehicles ?? []).length === 0 ? (
              <div className="text-xs text-muted-foreground">Nenhum veículo cadastrado.</div>
            ) : (
              <div className="space-y-2">
                {(vehicles ?? []).slice(0, 5).map((v) => (
                  <div key={v.id} className="flex items-center gap-3 text-sm">
                    <div className="h-9 w-9 rounded bg-muted grid place-items-center shrink-0">
                      <Car className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium truncate">{v.name}</div>
                      <div className="text-xs text-muted-foreground">
                        Desde {dateBR(v.created_at)}
                      </div>
                    </div>
                    <Badge variant="outline" className="capitalize text-[10px]">
                      {v.status.replace("_", " ")}
                    </Badge>
                  </div>
                ))}
                {(vehicles ?? []).length > 5 && (
                  <div className="text-xs text-muted-foreground text-center pt-1">
                    +{(vehicles ?? []).length - 5} veículo(s) — veja a aba Veículos
                  </div>
                )}
              </div>
            )}
          </Card>

          <RevenueBreakdownCard rentals={rentals ?? []} />


          <Card className="p-4 space-y-2">
            <div className="font-semibold text-sm">Observações administrativas</div>
            <p className="text-xs text-muted-foreground">
              Visível apenas para administradores da plataforma.
            </p>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={4}
              placeholder="Anote informações relevantes sobre este dono"
            />
            <Button
              size="sm"
              className="gap-1"
              disabled={saveNotes.isPending || notes === (profile.admin_notes ?? "")}
              onClick={() => saveNotes.mutate()}
            >
              <Save className="h-3.5 w-3.5" /> Salvar observações
            </Button>
          </Card>
        </TabsContent>

        <TabsContent value="assinatura" className="mt-4 space-y-2">
          {sub ? (
            <Card className="p-4 text-sm space-y-2">
              <div className="font-semibold mb-1">Assinatura atual</div>
              <Line icon={CheckCircle2} label="Plano" value={sub.plan} capitalize />
              <Line icon={CheckCircle2} label="Situação" value={sub.status} capitalize />
              <Line icon={Calendar} label="Iniciada em" value={dateBR(sub.started_at)} />
              <Line
                icon={Calendar}
                label="Vence em"
                value={`${dateBR(sub.current_period_end)} (${subDaysLeft} dia${subDaysLeft === 1 ? "" : "s"})`}
              />
              <Button className="mt-2 w-full gap-1" onClick={() => setManageOpen(true)}>
                <Settings className="h-4 w-4" /> Alterar plano ou vencimento
              </Button>
            </Card>
          ) : (
            <Card className="p-4 text-sm text-muted-foreground text-center space-y-3">
              Nenhuma assinatura registrada.
              <Button className="w-full gap-1" onClick={() => setManageOpen(true)}>
                <Settings className="h-4 w-4" /> Criar assinatura
              </Button>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="veiculos" className="mt-4 space-y-2">
          {(vehicles ?? []).length === 0 ? (
            <Card className="p-4 text-sm text-muted-foreground text-center">
              Nenhum veículo cadastrado.
            </Card>
          ) : (
            (vehicles ?? []).map((v) => (
              <Card key={v.id} className="p-3 text-sm flex items-center gap-3">
                <div className="h-10 w-10 rounded bg-muted grid place-items-center shrink-0">
                  <Car className="h-4 w-4 text-muted-foreground" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium truncate">{v.name}</div>
                  <div className="text-xs text-muted-foreground">
                    Cadastro em {dateBR(v.created_at)}
                  </div>
                </div>
                <Badge variant="outline" className="capitalize">
                  {v.status.replace("_", " ")}
                </Badge>
              </Card>
            ))
          )}
        </TabsContent>

        <TabsContent value="locacoes" className="mt-4 space-y-2">
          <Card className="p-3 text-sm grid grid-cols-3 gap-2 text-center">
            <div>
              <div className="text-xs text-muted-foreground">Ativas</div>
              <div className="font-bold">{stats.active}</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Finalizadas</div>
              <div className="font-bold">{stats.finalized}</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Total</div>
              <div className="font-bold">{stats.totalRentals}</div>
            </div>
          </Card>
          {(rentals ?? []).slice(0, 30).map((r) => (
            <Card key={r.id} className="p-3 text-sm">
              <div className="flex justify-between items-start gap-2">
                <div className="min-w-0">
                  <div className="font-medium capitalize">{r.status}</div>
                  <div className="text-xs text-muted-foreground">
                    {new Date(r.started_at).toLocaleString("pt-BR")}
                    {r.ended_at && ` → ${new Date(r.ended_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}`}
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-semibold">{currency(Number(r.amount ?? 0))}</div>
                  <div className="text-xs text-muted-foreground">
                    {r.planned_minutes ?? 0} min
                  </div>
                </div>
              </div>
            </Card>
          ))}
          {(rentals ?? []).length === 0 && (
            <Card className="p-4 text-sm text-muted-foreground text-center">
              Nenhuma locação registrada.
            </Card>
          )}
        </TabsContent>

        <TabsContent value="relatorios" className="mt-4 space-y-2">
          <div className="grid grid-cols-2 gap-2">
            <StatCard icon={DollarSign} label="Faturamento total" value={currency(stats.revenue)} />
            <StatCard icon={Timer} label="Locações finalizadas" value={String(stats.finalized)} />
            <StatCard icon={Timer} label="Locações ativas" value={String(stats.active)} />
            <StatCard
              icon={DollarSign}
              label="Ticket médio"
              value={currency(stats.finalized > 0 ? stats.revenue / stats.finalized : 0)}
            />
          </div>
          {stats.totalRentals === 0 && (
            <Card className="p-4 text-sm text-muted-foreground text-center">
              <BarChart3 className="h-6 w-6 mx-auto mb-2 opacity-50" />
              Sem dados para gerar relatórios ainda.
            </Card>
          )}
        </TabsContent>

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
      </Tabs>

      <ApproveOwnerDialog
        open={approveOpen}
        onOpenChange={setApproveOpen}
        userId={userId}
        ownerName={profile.full_name}
      />

      <ManageSubscriptionDialog
        open={manageOpen}
        onOpenChange={setManageOpen}
        userId={userId}
        current={sub ?? null}
      />
    </AdminShell>
  );
}

function RevenueBreakdownCard({ rentals }: { rentals: Rental[] }) {
  const [period, setPeriod] = useState<"diario" | "semanal" | "mensal">("diario");

  const buckets = useMemo(() => {
    const finalized = rentals.filter((r) => r.status === "finalizada");
    const now = new Date();
    const items: { label: string; total: number; count: number }[] = [];

    if (period === "diario") {
      for (let i = 13; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
        items.push({
          label: d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }),
          total: 0,
          count: 0,
        });
      }
      const start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 13);
      for (const r of finalized) {
        const dt = new Date(r.started_at);
        if (dt < start) continue;
        const idx = Math.floor(
          (new Date(dt.getFullYear(), dt.getMonth(), dt.getDate()).getTime() - start.getTime()) / 86400000,
        );
        if (idx >= 0 && idx < items.length) {
          items[idx].total += Number(r.amount ?? 0);
          items[idx].count += 1;
        }
      }
    } else if (period === "semanal") {
      const startOfWeek = (d: Date) => {
        const x = new Date(d.getFullYear(), d.getMonth(), d.getDate());
        const dow = (x.getDay() + 6) % 7;
        x.setDate(x.getDate() - dow);
        return x;
      };
      const thisWeek = startOfWeek(now);
      for (let i = 7; i >= 0; i--) {
        const s = new Date(thisWeek);
        s.setDate(s.getDate() - i * 7);
        items.push({
          label: `${String(s.getDate()).padStart(2, "0")}/${String(s.getMonth() + 1).padStart(2, "0")}`,
          total: 0,
          count: 0,
        });
      }
      const first = new Date(thisWeek);
      first.setDate(first.getDate() - 7 * 7);
      for (const r of finalized) {
        const dt = startOfWeek(new Date(r.started_at));
        if (dt < first) continue;
        const idx = Math.round((dt.getTime() - first.getTime()) / (7 * 86400000));
        if (idx >= 0 && idx < items.length) {
          items[idx].total += Number(r.amount ?? 0);
          items[idx].count += 1;
        }
      }
    } else {
      const meses = ["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"];
      for (let i = 11; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        items.push({
          label: `${meses[d.getMonth()]}/${String(d.getFullYear()).slice(2)}`,
          total: 0,
          count: 0,
        });
      }
      const first = new Date(now.getFullYear(), now.getMonth() - 11, 1);
      for (const r of finalized) {
        const dt = new Date(r.started_at);
        if (dt < first) continue;
        const idx = (dt.getFullYear() - first.getFullYear()) * 12 + (dt.getMonth() - first.getMonth());
        if (idx >= 0 && idx < items.length) {
          items[idx].total += Number(r.amount ?? 0);
          items[idx].count += 1;
        }
      }
    }
    return items;
  }, [rentals, period]);

  const totalPeriodo = buckets.reduce((s, b) => s + b.total, 0);
  const countPeriodo = buckets.reduce((s, b) => s + b.count, 0);
  const withData = [...buckets].reverse().filter((b) => b.count > 0);

  const tabs: { id: typeof period; label: string }[] = [
    { id: "diario", label: "Diário" },
    { id: "semanal", label: "Semanal" },
    { id: "mensal", label: "Mensal" },
  ];

  return (
    <Card className="p-4 space-y-3">
      <div className="flex items-center justify-between gap-2">
        <div className="font-semibold text-sm flex items-center gap-2">
          <Timer className="h-4 w-4" /> Resumo de locações
        </div>
        <div className="inline-flex rounded-lg bg-muted p-0.5">
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => setPeriod(t.id)}
              className={`px-2.5 py-1 text-xs rounded-md transition-colors ${
                period === t.id ? "bg-background shadow-sm font-semibold" : "text-muted-foreground"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 text-center">
        <div className="rounded-md bg-muted/40 p-2">
          <div className="text-xs text-muted-foreground">Total no período</div>
          <div className="font-bold">{currency(totalPeriodo)}</div>
        </div>
        <div className="rounded-md bg-muted/40 p-2">
          <div className="text-xs text-muted-foreground">Locações</div>
          <div className="font-bold">{countPeriodo}</div>
        </div>
      </div>

      {countPeriodo === 0 ? (
        <div className="text-xs text-muted-foreground text-center py-4">
          Nenhuma locação finalizada no período.
        </div>
      ) : (
        <div className="h-56 -mx-2">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={buckets} margin={{ top: 8, right: 8, left: 0, bottom: 4 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 10 }}
                interval="preserveStartEnd"
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 10 }}
                axisLine={false}
                tickLine={false}
                width={44}
                tickFormatter={(v) => (v >= 1000 ? `${Math.round(v / 100) / 10}k` : String(v))}
              />
              <Tooltip
                cursor={{ fill: "hsl(var(--muted) / 0.4)" }}
                contentStyle={{
                  fontSize: 12,
                  borderRadius: 8,
                  border: "1px solid hsl(var(--border))",
                  background: "hsl(var(--card))",
                }}
                labelStyle={{ fontWeight: 600 }}
                formatter={(v: number, _n, p) => [
                  `${currency(Number(v))} · ${p.payload.count} locaç${p.payload.count === 1 ? "ão" : "ões"}`,
                  "Faturamento",
                ]}
              />
              <Bar dataKey="total" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </Card>
  );
}

function StatCard({

  icon: Icon,
  label,
  value,
}: {
  icon: typeof Car;
  label: string;
  value: string;
}) {
  return (
    <Card className="p-3">
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Icon className="h-3.5 w-3.5" /> {label}
      </div>
      <div className="mt-1 text-lg font-bold">{value}</div>
    </Card>
  );
}

function Line({
  icon: Icon,
  label,
  value,
  capitalize,
}: {
  icon: typeof UserIcon;
  label: string;
  value: string;
  capitalize?: boolean;
}) {
  return (
    <div className="flex justify-between gap-2 items-center">
      <span className="text-muted-foreground flex items-center gap-2">
        <Icon className="h-3.5 w-3.5" /> {label}
      </span>
      <span className={capitalize ? "capitalize text-right" : "text-right"}>{value}</span>
    </div>
  );
}
