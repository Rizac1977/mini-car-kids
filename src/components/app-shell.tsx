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
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0">
              <div className="text-xs text-muted-foreground lg:hidden">MiniCar Gestão</div>
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
          </div>
        </header>
        <main className="px-4 lg:px-8 pt-4 pb-28 lg:pb-10 max-w-6xl mx-auto">{children}</main>
      </div>

      {/* Botão flutuante de suporte WhatsApp */}
      <a
        href="https://wa.me/5584998472400?text=Ol%C3%A1%2C%20preciso%20de%20suporte%20no%20MiniCar%20Gest%C3%A3o"
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Falar com o suporte no WhatsApp"
        className="fixed z-50 right-4 bottom-20 lg:bottom-6 h-14 w-14 rounded-full grid place-items-center text-white shadow-[var(--shadow-elevated)] hover:scale-105 transition-transform"
        style={{ backgroundColor: "#25D366" }}
      >
        <svg viewBox="0 0 32 32" className="h-7 w-7" fill="currentColor" aria-hidden="true">
          <path d="M19.11 17.24c-.3-.15-1.77-.87-2.05-.97-.28-.1-.48-.15-.68.15-.2.3-.78.97-.95 1.17-.18.2-.35.22-.65.08-.3-.15-1.27-.47-2.42-1.5-.9-.8-1.5-1.79-1.67-2.09-.18-.3-.02-.46.13-.61.13-.13.3-.35.45-.53.15-.18.2-.3.3-.5.1-.2.05-.38-.02-.53-.08-.15-.68-1.63-.93-2.24-.24-.58-.49-.5-.68-.51h-.58c-.2 0-.53.08-.8.38-.28.3-1.05 1.03-1.05 2.5s1.08 2.9 1.23 3.1c.15.2 2.12 3.24 5.14 4.55.72.31 1.28.5 1.71.63.72.23 1.37.2 1.89.12.58-.09 1.77-.72 2.02-1.42.25-.7.25-1.3.18-1.42-.08-.13-.28-.2-.58-.35Zm-5.55 7.6h-.01a10.94 10.94 0 0 1-5.57-1.52l-.4-.24-4.14 1.08 1.1-4.03-.26-.42a10.9 10.9 0 0 1-1.68-5.82c0-6.03 4.92-10.93 10.97-10.93a10.9 10.9 0 0 1 7.75 3.2 10.85 10.85 0 0 1 3.21 7.74c0 6.03-4.92 10.94-10.97 10.94Zm9.32-20.24A13.14 13.14 0 0 0 13.56 0C6.28 0 .35 5.9.35 13.14c0 2.31.6 4.57 1.75 6.55L.24 27l7.5-1.96a13.16 13.16 0 0 0 6.29 1.6h.01c7.27 0 13.2-5.9 13.2-13.14 0-3.51-1.37-6.81-3.86-9.3Z" />
        </svg>
      </a>

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
