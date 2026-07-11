import { Link, useRouterState } from "@tanstack/react-router";
import { type ReactNode } from "react";
import {
  Home,
  Car,
  PlusCircle,
  History,
  User,
  BarChart3,
  CreditCard,
  Timer,
  LogOut,
} from "lucide-react";
import { cn } from "@/lib/utils";

const mobileNav = [
  { to: "/app", label: "Início", icon: Home, exact: true },
  { to: "/app/locacoes", label: "Ativas", icon: Timer, exact: true },
  { to: "/app/locacoes/nova", label: "Nova", icon: PlusCircle, highlight: true },
  { to: "/app/veiculos", label: "Veículos", icon: Car },
  { to: "/app/perfil", label: "Perfil", icon: User },
];

const sideNav = [
  { to: "/app", label: "Dashboard", icon: Home, exact: true },
  { to: "/app/locacoes", label: "Locações ativas", icon: Timer },
  { to: "/app/locacoes/nova", label: "Nova locação", icon: PlusCircle },
  { to: "/app/veiculos", label: "Veículos", icon: Car },
  { to: "/app/historico", label: "Histórico", icon: History },
  { to: "/app/relatorios", label: "Relatórios", icon: BarChart3 },
  { to: "/app/assinatura", label: "Assinatura", icon: CreditCard },
  { to: "/app/perfil", label: "Perfil", icon: User },
];


export function AppShell({ children, title }: { children: ReactNode; title?: string }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const isActive = (to: string, exact?: boolean) =>
    exact ? pathname === to : pathname === to || pathname.startsWith(to + "/");

  return (
    <div className="min-h-screen bg-background">
      {/* Sidebar desktop */}
      <aside className="hidden lg:flex fixed inset-y-0 left-0 w-64 flex-col bg-sidebar text-sidebar-foreground">
        <div className="px-6 py-6 flex items-center gap-2">
          <div className="h-9 w-9 rounded-xl bg-sidebar-primary grid place-items-center text-sidebar-primary-foreground font-black">
            M
          </div>
          <div>
            <div className="font-bold leading-tight">MiniCar</div>
            <div className="text-xs opacity-70 leading-tight">Gestão</div>
          </div>
        </div>
        <nav className="flex-1 px-3 space-y-1">
          {sideNav.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.to, item.exact);
            return (
              <Link
                key={item.to}
                to={item.to}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors",
                  active
                    ? "bg-sidebar-primary text-sidebar-primary-foreground font-semibold"
                    : "hover:bg-sidebar-accent"
                )}
              >
                <Icon className="h-4 w-4" />
                {item.label}
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
            <LogOut className="h-4 w-4" />
            Sair
          </button>
        </div>
      </aside>

      {/* Conteúdo */}
      <div className="lg:pl-64">
        <header className="sticky top-0 z-30 bg-background/90 backdrop-blur border-b px-4 py-3 lg:px-8 lg:py-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs text-muted-foreground lg:hidden">MiniCar Gestão</div>
              <h1 className="text-lg lg:text-2xl font-bold tracking-tight">{title}</h1>
            </div>
          </div>
        </header>
        <main className="px-4 lg:px-8 pt-4 pb-28 lg:pb-10 max-w-6xl mx-auto">{children}</main>
      </div>

      {/* Bottom nav mobile */}
      <nav className="lg:hidden fixed bottom-0 inset-x-0 z-40 bg-card border-t shadow-[0_-4px_16px_oklch(0_0_0/0.05)]">
        <div className="grid grid-cols-5 h-16">
          {mobileNav.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.to, item.exact);
            if (item.highlight) {
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  className="flex flex-col items-center justify-center -mt-6"
                >
                  <div className="h-14 w-14 rounded-2xl bg-primary text-primary-foreground grid place-items-center shadow-[var(--shadow-elevated)]">
                    <Icon className="h-7 w-7" />
                  </div>
                  <span className="text-[10px] mt-1 font-medium">{item.label}</span>
                </Link>
              );
            }
            return (
              <Link
                key={item.to}
                to={item.to}
                className={cn(
                  "flex flex-col items-center justify-center gap-1 text-[11px]",
                  active ? "text-primary font-semibold" : "text-muted-foreground"
                )}
              >
                <Icon className="h-5 w-5" />
                {item.label}
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
