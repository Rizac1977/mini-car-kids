import { createFileRoute, Link, useRouterState } from "@tanstack/react-router";
import { type ReactNode, useMemo } from "react";
import { Card } from "@/components/ui/card";
import { currency } from "@/lib/mock-data";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import {
  LayoutDashboard,
  Users,
  LogOut,
  UserCheck,
  Clock,
  AlertTriangle,
  Car,
  Timer,
  DollarSign,
  UserPlus,
  ArrowUpRight,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/admin/")({
  head: () => ({
    meta: [
      { title: "Admin — MiniCar Gestão" },
      { name: "description", content: "Painel administrativo da plataforma MiniCar Gestão." },
    ],
  }),
  component: AdminDashboard,
});

const nav = [
  { to: "/admin", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { to: "/admin/donos", label: "Donos", icon: Users },
];

function AdminShell({ title, children }: { title: string; children: ReactNode }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  return (
    <div className="min-h-screen bg-background">
      <aside className="hidden lg:flex fixed inset-y-0 left-0 w-64 flex-col bg-sidebar text-sidebar-foreground">
        <div className="px-6 py-6 flex items-center gap-2">
          <div className="h-9 w-9 rounded-xl bg-accent grid place-items-center text-accent-foreground font-black">
            A
          </div>
          <div>
            <div className="font-bold leading-tight">Admin</div>
            <div className="text-xs opacity-70 leading-tight">MiniCar Gestão</div>
          </div>
        </div>
        <nav className="flex-1 px-3 space-y-1">
          {nav.map((n) => {
            const active = n.exact ? pathname === n.to : pathname.startsWith(n.to);
            const Icon = n.icon;
            return (
              <Link
                key={n.to}
                to={n.to}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm",
                  active
                    ? "bg-sidebar-primary text-sidebar-primary-foreground font-semibold"
                    : "hover:bg-sidebar-accent"
                )}
              >
                <Icon className="h-4 w-4" />
                {n.label}
              </Link>
            );
          })}
        </nav>
        <div className="p-3 border-t border-sidebar-border">
          <button
            onClick={async () => {
              const { signOut } = await import("@/hooks/use-auth");
              await signOut();
              window.location.href = "/login";
            }}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm hover:bg-sidebar-accent"
          >
            <LogOut className="h-4 w-4" /> Sair
          </button>
        </div>
      </aside>
      <div className="lg:pl-64">
        <header className="sticky top-0 z-30 bg-background/90 backdrop-blur border-b px-4 py-3 lg:px-8 lg:py-4 flex items-center justify-between gap-2">
          <div className="min-w-0">
            <div className="text-xs text-muted-foreground lg:hidden">Painel administrativo</div>
            <h1 className="text-lg lg:text-2xl font-bold tracking-tight truncate">{title}</h1>
          </div>
          <button
            onClick={async () => {
              const { signOut } = await import("@/hooks/use-auth");
              await signOut();
              window.location.href = "/login";
            }}
            className="lg:hidden inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground shrink-0"
            aria-label="Sair"
          >
            <LogOut className="h-4 w-4" /> Sair
          </button>
        </header>
        <main className="px-4 lg:px-8 pt-4 pb-20 max-w-6xl mx-auto">{children}</main>
        <nav className="lg:hidden fixed bottom-0 inset-x-0 z-40 bg-card border-t">
          <div className="grid grid-cols-2 h-16">
            {nav.map((n) => {
              const active = n.exact ? pathname === n.to : pathname.startsWith(n.to);
              const Icon = n.icon;
              return (
                <Link
                  key={n.to}
                  to={n.to}
                  className={cn(
                    "flex flex-col items-center justify-center gap-1 text-xs",
                    active ? "text-primary font-semibold" : "text-muted-foreground"
                  )}
                >
                  <Icon className="h-5 w-5" />
                  {n.label}
                </Link>
              );
            })}
          </div>
        </nav>
      </div>
    </div>
  );
}

function Stat({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  tone?: "primary" | "warning" | "destructive" | "accent";
}) {
  const bg = {
    primary: "bg-primary-soft text-primary",
    warning: "bg-warning/20 text-warning-foreground",
    destructive: "bg-destructive/15 text-destructive",
    accent: "bg-accent/20 text-accent-foreground",
  }[tone ?? "primary"];
  return (
    <Card className="p-4">
      <div className="flex items-center gap-3">
        <div className={`h-10 w-10 rounded-xl grid place-items-center ${bg}`}>
          <Icon className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <div className="text-xs text-muted-foreground truncate">{label}</div>
          <div className="text-lg font-bold truncate">{value}</div>
        </div>
      </div>
    </Card>
  );
}

function AdminDashboard() {
  const startOfMonth = useMemo(() => {
    const d = new Date();
    d.setDate(1);
    d.setHours(0, 0, 0, 0);
    return d.toISOString();
  }, []);
  const nowIso = useMemo(() => new Date().toISOString(), []);

  const { data, isLoading } = useQuery({
    queryKey: ["admin-dashboard", startOfMonth],
    queryFn: async () => {
      const [profilesRes, vehiclesRes, rentalsRes, subsRes, newMonthRes] = await Promise.all([
        supabase.from("profiles").select("account_status"),
        supabase.from("vehicles").select("id", { count: "exact", head: true }),
        supabase.from("rentals").select("amount,status"),
        supabase.from("subscriptions").select("status,expires_at"),
        supabase
          .from("profiles")
          .select("id", { count: "exact", head: true })
          .gte("created_at", startOfMonth),
      ]);

      const profiles = (profilesRes.data ?? []) as { account_status: string }[];
      const rentals = (rentalsRes.data ?? []) as { amount: number; status: string }[];
      const subs = (subsRes.data ?? []) as { status: string; expires_at: string | null }[];

      return {
        totalOwners: profiles.length,
        activeOwners: profiles.filter((p) => p.account_status === "ativo").length,
        pending: profiles.filter((p) => p.account_status === "pendente").length,
        expired: subs.filter(
          (s) => s.status === "vencida" || (s.expires_at && s.expires_at < nowIso && s.status !== "ativa"),
        ).length,
        totalVehicles: vehiclesRes.count ?? 0,
        totalRentals: rentals.length,
        volume: rentals
          .filter((r) => r.status === "finalizada")
          .reduce((s, r) => s + Number(r.amount), 0),
        newThisMonth: newMonthRes.count ?? 0,
      };
    },
  });

  return (
    <AdminShell title="Dashboard">
      <div className="space-y-6">
        {isLoading || !data ? (
          <div className="grid place-items-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <Stat icon={Users} label="Donos cadastrados" value={String(data.totalOwners)} tone="primary" />
              <Stat icon={UserCheck} label="Donos ativos" value={String(data.activeOwners)} tone="primary" />
              <Stat icon={Clock} label="Cadastros pendentes" value={String(data.pending)} tone="warning" />
              <Stat icon={AlertTriangle} label="Assinaturas vencidas" value={String(data.expired)} tone="destructive" />
              <Stat icon={Car} label="Veículos" value={String(data.totalVehicles)} />
              <Stat icon={Timer} label="Locações registradas" value={data.totalRentals.toLocaleString("pt-BR")} />
              <Stat icon={DollarSign} label="Volume financeiro" value={currency(data.volume)} tone="accent" />
            </div>

            <Card className="p-4">
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-xl bg-accent/20 grid place-items-center">
                  <UserPlus className="h-6 w-6 text-accent-foreground" />
                </div>
                <div className="flex-1">
                  <div className="text-xs text-muted-foreground">Novos clientes este mês</div>
                  <div className="text-2xl font-bold">{data.newThisMonth}</div>
                </div>
                <ArrowUpRight className="h-5 w-5 text-success" />
              </div>
            </Card>
          </>
        )}

        <Link to="/admin/donos">
          <Card className="p-4 flex items-center justify-between hover:bg-muted/40 transition-colors">
            <div>
              <div className="font-bold">Gerenciar donos</div>
              <div className="text-sm text-muted-foreground">
                Aprovar, suspender ou consultar contas
              </div>
            </div>
            <ArrowUpRight className="h-5 w-5" />
          </Card>
        </Link>
      </div>
    </AdminShell>
  );
}

export { AdminShell };
