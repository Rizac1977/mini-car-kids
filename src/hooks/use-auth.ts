import { useEffect, useState } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

export type AppRole = "platform_admin" | "vehicle_owner";
export type AccountStatus = "pendente" | "ativo" | "suspenso" | "recusado";

export interface Profile {
  id: string;
  user_id: string;
  full_name: string;
  business_name: string | null;
  phone: string | null;
  profile_photo_url: string | null;
  city: string | null;
  state: string | null;
  account_status: AccountStatus;
  created_at: string;
  updated_at: string;
}

export function useAuth() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Filtra apenas transições de identidade — ignora TOKEN_REFRESHED
    // (dispara ~1x/hora e no foco da aba) e INITIAL_SESSION (a cada mount),
    // evitando re-renders e refetches desnecessários.
    const { data: sub } = supabase.auth.onAuthStateChange((event, s) => {
      if (
        event === "SIGNED_IN" ||
        event === "SIGNED_OUT" ||
        event === "USER_UPDATED"
      ) {
        setSession(s);
      }
    });
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  return { session, user: session?.user ?? null, loading };
}

export async function fetchProfileAndRole(userId: string): Promise<{
  profile: Profile | null;
  role: AppRole | null;
}> {
  const [profileRes, rolesRes] = await Promise.all([
    supabase.from("profiles").select("*").eq("user_id", userId).maybeSingle(),
    supabase.from("user_roles").select("role").eq("user_id", userId).limit(10),
  ]);
  const roles = (rolesRes.data as { role: AppRole }[] | null) ?? [];
  const role: AppRole | null = roles.some((r) => r.role === "platform_admin")
    ? "platform_admin"
    : roles.some((r) => r.role === "vehicle_owner")
      ? "vehicle_owner"
      : null;
  return {
    profile: (profileRes.data as Profile | null) ?? null,
    role,
  };
}

export function routeForUser(role: AppRole | null, status: AccountStatus | null): string {
  if (role === "platform_admin") return "/admin";
  if (status === "ativo") return "/app";
  return "/aguardando-aprovacao";
}

export async function signOut(): Promise<void> {
  await supabase.auth.signOut();
}

export type { User };
