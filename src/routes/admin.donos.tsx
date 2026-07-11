import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Search, ChevronRight, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { dateBR, type AccountStatus } from "@/lib/mock-data";
import { AdminShell } from "./admin.index";

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
  const [filter, setFilter] = useState<(typeof filters)[number]["key"]>("todos");
  const [search, setSearch] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["admin", "donos"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id,user_id,full_name,business_name,city,state,account_status,created_at")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Row[];
    },
  });

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (data ?? [])
      .filter((r) => (filter === "todos" ? true : r.account_status === filter))
      .filter((r) =>
        !q
          ? true
          : [r.full_name, r.business_name, r.city, r.state]
              .filter(Boolean)
              .some((v) => (v as string).toLowerCase().includes(q))
      );
  }, [data, filter, search]);

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
              <Link key={o.id} to="/admin/donos/$id" params={{ id: o.user_id }}>
                <Card className="p-4 hover:bg-muted/40 transition-colors">
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
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>
    </AdminShell>
  );
}
