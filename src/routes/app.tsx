import { createFileRoute, redirect, Outlet } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { fetchProfileAndRole } from "@/hooks/use-auth";

export const Route = createFileRoute("/app")({
  ssr: false,
  beforeLoad: async () => {
    const { data } = await supabase.auth.getUser();
    if (!data.user) throw redirect({ to: "/login" });
    const { profile, role } = await fetchProfileAndRole(data.user.id);
    if (role === "platform_admin") throw redirect({ to: "/admin" });
    if (!profile || profile.account_status !== "ativo") {
      throw redirect({ to: "/aguardando-aprovacao" });
    }
    return { user: data.user, profile, role };
  },
  component: () => <Outlet />,
});
