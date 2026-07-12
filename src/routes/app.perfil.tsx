import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Mail, Phone, MapPin, Calendar, Shield, LogOut, CreditCard,
  ChevronRight, Camera, Loader2, Save, X,
} from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { signOut, type Profile } from "@/hooks/use-auth";
import { ChangePasswordCard } from "@/components/change-password-card";

export const Route = createFileRoute("/app/perfil")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Perfil — MiniCar Gestão" },
      { name: "description", content: "Gerencie suas informações pessoais e da conta." },
    ],
  }),
  component: PerfilPage,
});

const dateBR = (d: string | Date) =>
  new Date(d).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });

const statusMap = {
  ativo: { label: "Conta ativa", cls: "bg-success/15 text-success" },
  pendente: { label: "Aguardando aprovação", cls: "bg-warning/15 text-warning-foreground" },
  suspenso: { label: "Suspenso", cls: "bg-destructive/15 text-destructive" },
  recusado: { label: "Recusado", cls: "bg-destructive/15 text-destructive" },
} as const;

async function loadProfileData() {
  const { data: u } = await supabase.auth.getUser();
  if (!u.user) throw new Error("Sessão inválida");
  const [profileRes, subRes] = await Promise.all([
    supabase.from("profiles").select("*").eq("user_id", u.user.id).maybeSingle(),
    supabase.from("subscriptions").select("status, current_period_end").eq("user_id", u.user.id).maybeSingle(),
  ]);
  const profile = profileRes.data as Profile | null;
  let photoUrl: string | null = null;
  if (profile?.profile_photo_url) {
    const { data } = await supabase.storage
      .from("profile-photos")
      .createSignedUrl(profile.profile_photo_url, 3600);
    photoUrl = data?.signedUrl ?? null;
  }
  return {
    user: u.user,
    profile,
    photoUrl,
    subscription: subRes.data as { status: string; current_period_end: string } | null,
  };
}

function PerfilPage() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ["profile-page"], queryFn: loadProfileData });
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ full_name: "", business_name: "", phone: "", city: "", state: "" });
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (data?.profile) {
      setForm({
        full_name: data.profile.full_name ?? "",
        business_name: data.profile.business_name ?? "",
        phone: data.profile.phone ?? "",
        city: data.profile.city ?? "",
        state: data.profile.state ?? "",
      });
    }
  }, [data?.profile]);

  const initials = useMemo(() => {
    const n = data?.profile?.full_name ?? "";
    return n.split(" ").filter(Boolean).slice(0, 2).map((s) => s[0]).join("").toUpperCase() || "?";
  }, [data?.profile?.full_name]);

  const saveMut = useMutation({
    mutationFn: async () => {
      if (!data?.user) throw new Error("Sessão inválida");
      const { error } = await supabase
        .from("profiles")
        .update({
          full_name: form.full_name.trim(),
          business_name: form.business_name.trim() || null,
          phone: form.phone.trim() || null,
          city: form.city.trim() || null,
          state: form.state.trim().toUpperCase() || null,
        })
        .eq("user_id", data.user.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Perfil atualizado");
      setEditing(false);
      qc.invalidateQueries({ queryKey: ["profile-page"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const uploadMut = useMutation({
    mutationFn: async (file: File) => {
      if (!data?.user) throw new Error("Sessão inválida");
      if (file.size > 5 * 1024 * 1024) throw new Error("A foto deve ter no máximo 5 MB");
      const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
      const path = `${data.user.id}/avatar.${ext}`;
      const { error: upErr } = await supabase.storage
        .from("profile-photos")
        .upload(path, file, { upsert: true, contentType: file.type });
      if (upErr) throw upErr;
      const { error: dbErr } = await supabase
        .from("profiles")
        .update({ profile_photo_url: path })
        .eq("user_id", data.user.id);
      if (dbErr) throw dbErr;
    },
    onSuccess: () => {
      toast.success("Foto atualizada");
      qc.invalidateQueries({ queryKey: ["profile-page"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (isLoading || !data) {
    return (
      <AppShell title="Perfil">
        <div className="flex justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
      </AppShell>
    );
  }

  const { profile, user, photoUrl, subscription } = data;
  if (!profile) return <AppShell title="Perfil"><div className="text-center py-10 text-sm text-muted-foreground">Perfil não encontrado.</div></AppShell>;

  const status = statusMap[profile.account_status];
  const subDays = subscription
    ? Math.ceil((new Date(subscription.current_period_end).getTime() - Date.now()) / 86400000)
    : null;

  return (
    <AppShell title="Perfil">
      <div className="space-y-4">
        <Card className="p-6 flex flex-col items-center text-center">
          <div className="relative mb-3">
            <div className="h-20 w-20 rounded-full bg-primary text-primary-foreground grid place-items-center text-2xl font-bold overflow-hidden">
              {photoUrl ? (
                <img src={photoUrl} alt="Foto do perfil" className="h-full w-full object-cover" />
              ) : initials}
            </div>
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              disabled={uploadMut.isPending}
              className="absolute -bottom-1 -right-1 h-8 w-8 rounded-full bg-primary text-primary-foreground grid place-items-center shadow-md hover:opacity-90 disabled:opacity-60"
              aria-label="Alterar foto"
            >
              {uploadMut.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />}
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) uploadMut.mutate(f);
                e.target.value = "";
              }}
            />
          </div>
          <div className="font-bold text-lg">{profile.full_name}</div>
          {profile.business_name && <div className="text-sm text-muted-foreground">{profile.business_name}</div>}
          <Badge variant="outline" className={`mt-2 gap-1 border-transparent ${status.cls}`}>
            <Shield className="h-3 w-3" /> {status.label}
          </Badge>
        </Card>

        {editing ? (
          <Card className="p-4 space-y-3">
            <div className="flex items-center justify-between mb-1">
              <h2 className="font-bold text-sm">Editar informações</h2>
              <button type="button" onClick={() => setEditing(false)} className="text-muted-foreground">
                <X className="h-4 w-4" />
              </button>
            </div>
            <Field label="Nome completo" value={form.full_name} onChange={(v) => setForm({ ...form, full_name: v })} />
            <Field label="Nome comercial" value={form.business_name} onChange={(v) => setForm({ ...form, business_name: v })} />
            <Field label="Telefone" value={form.phone} onChange={(v) => setForm({ ...form, phone: v })} />
            <div className="grid grid-cols-[1fr_80px] gap-3">
              <Field label="Cidade" value={form.city} onChange={(v) => setForm({ ...form, city: v })} />
              <Field label="UF" value={form.state} onChange={(v) => setForm({ ...form, state: v.slice(0, 2) })} />
            </div>
            <Button
              className="w-full h-12 gap-2 font-semibold"
              onClick={() => saveMut.mutate()}
              disabled={saveMut.isPending || !form.full_name.trim()}
            >
              {saveMut.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Save className="h-4 w-4" /> Salvar alterações</>}
            </Button>
          </Card>
        ) : (
          <Card className="p-4 space-y-3 text-sm">
            <Row icon={Mail} label={user.email ?? ""} />
            {profile.phone && <Row icon={Phone} label={profile.phone} />}
            {(profile.city || profile.state) && (
              <Row icon={MapPin} label={[profile.city, profile.state].filter(Boolean).join(" / ")} />
            )}
            <Row icon={Calendar} label={`Na plataforma desde ${dateBR(profile.created_at)}`} />
          </Card>
        )}

        <Link to="/app/assinatura">
          <Card className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-accent/20 grid place-items-center">
              <CreditCard className="h-5 w-5 text-accent-foreground" />
            </div>
            <div className="flex-1">
              <div className="font-semibold text-sm">Minha assinatura</div>
              <div className="text-xs text-muted-foreground">
                {subscription ? subLabel(subscription.status, subDays) : "Sem assinatura ativa"}
              </div>
            </div>
            <ChevronRight className="h-5 w-5 text-muted-foreground" />
          </Card>
        </Link>

        {!editing && (
          <Button variant="outline" className="w-full h-12" onClick={() => setEditing(true)}>
            Editar perfil
          </Button>
        )}

        <Button
          variant="ghost"
          className="w-full h-12 gap-2 text-destructive hover:text-destructive"
          onClick={async () => {
            await signOut();
            window.location.href = "/login";
          }}
        >
          <LogOut className="h-4 w-4" /> Sair da conta
        </Button>
      </div>
    </AppShell>
  );
}

function subLabel(status: string, days: number | null) {
  if (status === "cancelada") return "Cancelada";
  if (status === "inadimplente") return "Inadimplente";
  const s = status === "trial" ? "Período de teste" : "Ativa";
  if (days == null) return s;
  if (days < 0) return `${s} · vencida há ${-days} dia${-days === 1 ? "" : "s"}`;
  return `${s} · vence em ${days} dia${days === 1 ? "" : "s"}`;
}

function Row({ icon: Icon, label }: { icon: React.ElementType; label: string }) {
  return (
    <div className="flex items-center gap-3">
      <Icon className="h-4 w-4 text-muted-foreground shrink-0" />
      <span className="truncate">{label}</span>
    </div>
  );
}

function Field({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      <Input className="h-11" value={value} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}
