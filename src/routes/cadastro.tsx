import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { Loader2, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { BrandLogo } from "@/components/brand-logo";
import { supabase } from "@/integrations/supabase/client";
import { translateAuthError } from "@/lib/auth-errors";

export const Route = createFileRoute("/cadastro")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Criar conta — MiniCar Gestão" },
      { name: "description", content: "Cadastre-se para gerenciar seus veículos elétricos infantis com controle de tempo, valores e histórico." },
    ],
  }),
  component: CadastroPage,
});

function CadastroPage() {
  const [form, setForm] = useState({
    full_name: "",
    business_name: "",
    phone: "",
    email: "",
    city: "",
    state: "",
    password: "",
    password2: "",
    terms: false,
  });
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const update = (k: string, v: string | boolean) => setForm((f) => ({ ...f, [k]: v }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.terms) {
      toast.error("Você precisa aceitar os termos de uso");
      return;
    }
    if (form.password.length < 8) {
      toast.error("A senha deve ter pelo menos 8 caracteres");
      return;
    }
    if (form.password !== form.password2) {
      toast.error("As senhas não coincidem");
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email: form.email,
      password: form.password,
      options: {
        emailRedirectTo: `${window.location.origin}/login`,
        data: {
          full_name: form.full_name,
          business_name: form.business_name || null,
          phone: form.phone || null,
          city: form.city || null,
          state: form.state || null,
        },
      },
    });
    if (error) {
      toast.error(translateAuthError(error.message));
      setLoading(false);
      return;
    }
    toast.success("Conta criada! Aguarde aprovação do administrador.");
    navigate({ to: "/aguardando-aprovacao" });
  };

  return (
    <div className="min-h-screen bg-background px-6 py-8">
      <div className="w-full max-w-sm mx-auto">
        <Link to="/login" className="inline-flex items-center gap-1 text-sm text-muted-foreground mb-6">
          <ArrowLeft className="h-4 w-4" /> Voltar
        </Link>
        <div className="mb-8">
          <BrandLogo size="md" />
        </div>
        <h1 className="text-2xl font-bold mb-1">Crie sua conta</h1>
        <p className="text-sm text-muted-foreground mb-6">
          Comece a controlar suas locações em minutos
        </p>

        <form className="space-y-4" onSubmit={handleSubmit}>
          <F label="Nome completo *" value={form.full_name} onChange={(v) => update("full_name", v)} required />
          <F label="Nome comercial (opcional)" value={form.business_name} onChange={(v) => update("business_name", v)} />
          <F label="Telefone" value={form.phone} onChange={(v) => update("phone", v)} placeholder="(00) 00000-0000" />
          <F label="E-mail *" type="email" value={form.email} onChange={(v) => update("email", v)} required />
          <div className="grid grid-cols-[1fr_80px] gap-3">
            <F label="Cidade" value={form.city} onChange={(v) => update("city", v)} />
            <F label="Estado" value={form.state} onChange={(v) => update("state", v)} placeholder="UF" />
          </div>
          <F label="Senha *" type="password" value={form.password} onChange={(v) => update("password", v)} required />
          <p className="text-xs text-muted-foreground -mt-2">
            Mínimo 8 caracteres. Evite senhas comuns (ex.: 12345678, senha123) — elas são bloqueadas por segurança.
          </p>
          <F label="Confirmar senha *" type="password" value={form.password2} onChange={(v) => update("password2", v)} required />

          <label className="flex items-start gap-2 text-sm pt-2 cursor-pointer">
            <Checkbox
              className="mt-0.5"
              checked={form.terms}
              onCheckedChange={(c) => update("terms", c === true)}
            />
            <span className="text-muted-foreground">
              Aceito os <span className="text-primary font-medium">termos de uso</span> e a{" "}
              <span className="text-primary font-medium">política de privacidade</span>.
            </span>
          </label>

          <Button className="w-full h-12 text-base font-semibold mt-2" disabled={loading}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Criar conta"}
          </Button>
        </form>

        <p className="text-xs text-muted-foreground text-center mt-6">
          Novos cadastros passam por aprovação do administrador antes de liberar todas as funções.
        </p>
      </div>
    </div>
  );
}

function F({
  label,
  value,
  onChange,
  ...rest
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
} & Omit<React.ComponentProps<"input">, "value" | "onChange">) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      <Input className="h-12" value={value} onChange={(e) => onChange(e.target.value)} {...rest} />
    </div>
  );
}
