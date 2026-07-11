import { createFileRoute, redirect, Outlet } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { fetchProfileAndRole } from "@/hooks/use-auth";

export const Route = createFileRoute("/admin")({
  ssr: false,
  // Evita re-execução do guarda em cada navegação entre páginas de /admin
  staleTime: Infinity,
  shouldReload: false,
  beforeLoad: async () => {
    const { data } = await supabase.auth.getUser();
    if (!data.user) throw redirect({ to: "/login" });
    const { role } = await fetchProfileAndRole(data.user.id);
    if (role !== "platform_admin") {
      throw redirect({ to: "/app" });
    }
    return { user: data.user };
  },
  component: () => <Outlet />,
});
