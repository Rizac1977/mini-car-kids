import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Search, ChevronRight, Loader2, CheckCircle2, XCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { dateBR } from "@/lib/mock-data";
import type { AccountStatus } from "@/hooks/use-auth";
import { AdminShell } from "./admin.index";
import { ApproveOwnerDialog } from "@/components/approve-owner-dialog";

export const Route = createFileRoute("/admin/donos")({
  head: () => ({
    meta: [
      { title: "Donos cadastrados — Admin" },
      { name: "description", content: "Lista de donos de veículos cadastrados na plataforma." },
    ],
  }),
  component: DonosPage,
});

type Row = {
  id: string;
  user_id: string;
  full_name: string;
  business_name: string | null;
  city: string | null;
  state: string | null;
  account_status: AccountStatus;
  created_at: string;
  subscriptions?: { status: string | null; current_period_end: string | null } | null;
};

const statusStyle: Record<string, string> = {
  ativo: "bg-success/15 text-success border-success/30",
  pendente: "bg-warning/20 text-warning-foreground border-warning/40",
  suspenso: "bg-destructive/15 text-destructive border-destructive/30",
  recusado: "bg-destructive/15 text-destructive border-destructive/30",
};

const filters = [
  { key: "todos", label: "Todos" },
  { key: "pendente", label: "Pendentes" },
  { key: "ativo", label: "Ativos" },
  { key: "suspenso", label: "Suspensos" },
  { key: "recusado", label: "Recusados" },
] as const;

function DonosPage() {
  const navigate = useNavigate();
  const [filter, setFilter] = useState<(typeof filters)[number]["key"]>("todos");
  const [search, setSearch] = useState("");
  const [stateFilter, setStateFilter] = useState("");
  const [subStatus, setSubStatus] = useState<"todas" | "trial" | "ativa" | "inadimplente" | "cancelada" | "vencidas" | "vencendo">("todas");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [approveTarget, setApproveTarget] = useState<{ userId: string; name: string } | null>(null);
  const qc = useQueryClient();

  const decide = useMutation({
    mutationFn: async ({ userId, next }: { userId: string; next: AccountStatus }) => {
      const { data: userData } = await supabase.auth.getUser();
      const adminId = userData.user?.id;
      if (!adminId) throw new Error("Sessão expirada");
      const { error } = await supabase
        .from("profiles")
        .update({ account_status: next })
        .eq("user_id", userId);
      if (error) throw error;
      await supabase.from("administrative_logs").insert({
        administrator_id: adminId,
        affected_user_id: userId,
        action: "Cadastro recusado",
        new_data: { account_status: next },
      });
    },
    onSuccess: () => {
      toast.success("Cadastro recusado");
      void qc.invalidateQueries({ queryKey: ["admin", "donos"] });
    },
    onError: (e: Error) => toast.error(e.message || "Erro ao atualizar"),
  });

  const { data, isLoading } = useQuery({
    queryKey: ["admin", "donos"],
    queryFn: async () => {
      const [profilesRes, subsRes] = await Promise.all([
        supabase
          .from("profiles")
          .select("id,user_id,full_name,business_name,city,state,account_status,created_at")
          .order("created_at", { ascending: false }),
        supabase.from("subscriptions").select("user_id,status,current_period_end"),
      ]);
      if (profilesRes.error) throw profilesRes.error;
      if (subsRes.error) throw subsRes.error;
      const subMap = new Map(
        (subsRes.data ?? []).map((s) => [s.user_id, { status: s.status, current_period_end: s.current_period_end }])
      );
      return (profilesRes.data ?? []).map((p) => ({
        ...p,
        subscriptions: subMap.get(p.user_id) ?? null,
      })) as unknown as Row[];
    },
  });

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    const nowIso = new Date().toISOString();
    const in7 = new Date();
    in7.setDate(in7.getDate() + 7);
    const in7Iso = in7.toISOString();
    const fromIso = fromDate ? new Date(fromDate + "T00:00:00").toISOString() : null;
    const toIso = toDate ? new Date(toDate + "T23:59:59").toISOString() : null;
    const stateQ = stateFilter.trim().toLowerCase();

    return (data ?? [])
      .filter((r) => (filter === "todos" ? true : r.account_status === filter))
      .filter((r) =>
        !q
          ? true
          : [r.full_name, r.business_name, r.city, r.state]
              .filter(Boolean)
              .some((v) => (v as string).toLowerCase().includes(q))
      )
      .filter((r) => (stateQ ? (r.state ?? "").toLowerCase().includes(stateQ) : true))
      .filter((r) => (fromIso ? r.created_at >= fromIso : true))
      .filter((r) => (toIso ? r.created_at <= toIso : true))
      .filter((r) => {
        if (subStatus === "todas") return true;
        const s = r.subscriptions;
        const end = s?.current_period_end ?? null;
        if (subStatus === "vencidas") return !!end && end < nowIso;
        if (subStatus === "vencendo") return !!end && end >= nowIso && end <= in7Iso;
        return s?.status === subStatus;
      });
  }, [data, filter, search, stateFilter, subStatus, fromDate, toDate]);

  const pendingCount = (data ?? []).filter((r) => r.account_status === "pendente").length;

  return (
    <AdminShell title="Donos cadastrados">
      <div className="space-y-4">
        {pendingCount > 0 && filter !== "pendente" && (
          <button
            onClick={() => setFilter("pendente")}
            className="w-full text-left"
          >
            <Card className="p-4 bg-warning/10 border-warning/40">
              <div className="text-sm font-semibold text-warning-foreground">
                {pendingCount} cadastro{pendingCount > 1 ? "s" : ""} aguardando aprovação
              </div>
              <div className="text-xs text-muted-foreground">Toque para revisar</div>
            </Card>
          </button>
        )}

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome, cidade ou negócio"
            className="h-12 pl-10"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
          {filters.map((f) => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={`shrink-0 px-4 h-9 rounded-full text-sm font-medium border ${
                filter === f.key
                  ? "bg-foreground text-background border-foreground"
                  : "bg-card text-foreground border-border"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        <button
          type="button"
          onClick={() => setShowAdvanced((v) => !v)}
          className="text-xs text-muted-foreground underline underline-offset-2 self-start"
        >
          {showAdvanced ? "Ocultar filtros avançados" : "Mostrar filtros avançados"}
        </button>

        {showAdvanced && (
          <Card className="p-3 space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs text-muted-foreground">Estado (UF)</label>
                <Input
                  placeholder="SP"
                  value={stateFilter}
                  onChange={(e) => setStateFilter(e.target.value)}
                  className="h-9 mt-1"
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Assinatura</label>
                <select
                  value={subStatus}
                  onChange={(e) => setSubStatus(e.target.value as typeof subStatus)}
                  className="mt-1 h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
                >
                  <option value="todas">Todas</option>
                  <option value="trial">Trial</option>
                  <option value="ativa">Ativa</option>
                  <option value="inadimplente">Inadimplente</option>
                  <option value="cancelada">Cancelada</option>
                  <option value="vencendo">Vencendo em 7 dias</option>
                  <option value="vencidas">Vencidas</option>
                </select>
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Entrada de</label>
                <Input
                  type="date"
                  value={fromDate}
                  onChange={(e) => setFromDate(e.target.value)}
                  className="h-9 mt-1"
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Até</label>
                <Input
                  type="date"
                  value={toDate}
                  onChange={(e) => setToDate(e.target.value)}
                  className="h-9 mt-1"
                />
              </div>
            </div>
            {(stateFilter || subStatus !== "todas" || fromDate || toDate) && (
              <Button
                variant="outline"
                className="h-8 w-full text-xs"
                onClick={() => {
                  setStateFilter("");
                  setSubStatus("todas");
                  setFromDate("");
                  setToDate("");
                }}
              >
                Limpar filtros
              </Button>
            )}
          </Card>
        )}


        {isLoading ? (
          <div className="py-16 grid place-items-center text-muted-foreground">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        ) : rows.length === 0 ? (
          <Card className="p-8 text-center text-sm text-muted-foreground">
            Nenhum dono encontrado.
          </Card>
        ) : (
          <div className="space-y-3">
            {rows.map((o) => (
              <Card
                key={o.id}
                role="button"
                tabIndex={0}
                onClick={() =>
                  navigate({ to: "/admin/donos/$id", params: { id: o.user_id } })
                }
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    navigate({ to: "/admin/donos/$id", params: { id: o.user_id } });
                  }
                }}
                className="overflow-hidden cursor-pointer hover:bg-muted/40 transition-colors focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <div className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="h-11 w-11 rounded-full bg-primary text-primary-foreground grid place-items-center font-bold shrink-0">
                      {o.full_name
                        .split(" ")
                        .map((n) => n[0])
                        .slice(0, 2)
                        .join("")
                        .toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <div className="font-semibold truncate">{o.full_name}</div>
                          <div className="text-xs text-muted-foreground truncate">
                            {[o.business_name, [o.city, o.state].filter(Boolean).join("/")]
                              .filter(Boolean)
                              .join(" · ") || "—"}
                          </div>
                        </div>
                        <Badge
                          variant="outline"
                          className={`${statusStyle[o.account_status] ?? "bg-muted"} capitalize`}
                        >
                          {o.account_status}
                        </Badge>
                      </div>
                      <div className="mt-2 text-xs text-muted-foreground">
                        Entrou em {dateBR(o.created_at)}
                      </div>
                    </div>
                    <ChevronRight className="h-5 w-5 text-muted-foreground shrink-0" />
                  </div>
                </div>
                {o.account_status === "pendente" && (
                  <div className="grid grid-cols-2 gap-2 px-4 pb-4 pt-3 border-t">
                    <Button
                      variant="outline"
                      className="h-10 gap-1 text-success border-success/40"
                      disabled={decide.isPending}
                      onClick={() => setApproveTarget({ userId: o.user_id, name: o.full_name })}
                    >
                      <CheckCircle2 className="h-4 w-4" /> Aprovar
                    </Button>
                    <Button
                      variant="outline"
                      className="h-10 gap-1 text-destructive border-destructive/40"
                      disabled={decide.isPending}
                      onClick={() => decide.mutate({ userId: o.user_id, next: "recusado" })}
                    >
                      <XCircle className="h-4 w-4" /> Recusar
                    </Button>
                  </div>
                )}
              </Card>
            ))}
          </div>
        )}
      </div>

      <ApproveOwnerDialog
        open={!!approveTarget}
        onOpenChange={(v) => !v && setApproveTarget(null)}
        userId={approveTarget?.userId ?? ""}
        ownerName={approveTarget?.name}
      />
    </AdminShell>
  );
}
