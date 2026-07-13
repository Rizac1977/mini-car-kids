import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { Loader2, ArrowLeft, AlertCircle } from "lucide-react";
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

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

function formatPhoneBR(input: string): string {
  const digits = input.replace(/\D/g, "").slice(0, 11);
  if (digits.length === 0) return "";
  if (digits.length <= 2) return `(${digits}`;
  if (digits.length <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  if (digits.length <= 10)
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
}

function isValidPhoneBR(v: string) {
  const d = v.replace(/\D/g, "");
  return d.length === 10 || d.length === 11;
}

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
  const [errors, setErrors] = useState<Record<string, string | null>>({});
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const update = (k: string, v: string | boolean) => {
    setForm((f) => ({ ...f, [k]: v }));
    if (errors[k]) setErrors((e) => ({ ...e, [k]: null }));
  };

  const validate = () => {
    const e: Record<string, string | null> = {};
    if (!form.full_name.trim()) e.full_name = "Informe seu nome completo.";
    if (!form.phone.trim()) e.phone = "Informe o telefone.";
    else if (!isValidPhoneBR(form.phone))
      e.phone = "Telefone inválido. Use (00) 00000-0000.";
    if (!form.email.trim()) e.email = "Informe o e-mail.";
    else if (!EMAIL_RE.test(form.email.trim()))
      e.email = "E-mail inválido. Ex.: nome@dominio.com";
    if (form.password.length < 8)
      e.password = "A senha deve ter pelo menos 8 caracteres.";
    if (!form.password2) e.password2 = "Confirme sua senha.";
    else if (form.password !== form.password2)
      e.password2 = "As senhas não coincidem.";
    if (!form.terms) e.terms = "Você precisa aceitar os termos de uso.";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (ev: React.FormEvent) => {
    ev.preventDefault();
    if (!validate()) {
      toast.error("Corrija os campos destacados.");
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email: form.email.trim(),
      password: form.password,
      options: {
        emailRedirectTo: `${window.location.origin}/login`,
        data: {
          full_name: form.full_name.trim(),
          business_name: form.business_name.trim() || null,
          phone: form.phone.trim(),
          city: form.city.trim() || null,
          state: form.state.trim().toUpperCase() || null,
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

        <form className="space-y-4" onSubmit={handleSubmit} noValidate>
          <F
            label="Nome completo *"
            value={form.full_name}
            onChange={(v) => update("full_name", v)}
            error={errors.full_name}
            autoComplete="name"
            required
          />
          <F
            label="Nome comercial (opcional)"
            value={form.business_name}
            onChange={(v) => update("business_name", v)}
            autoComplete="organization"
          />
          <F
            label="Telefone *"
            value={form.phone}
            onChange={(v) => update("phone", formatPhoneBR(v))}
            placeholder="(00) 00000-0000"
            inputMode="tel"
            autoComplete="tel"
            maxLength={16}
            error={errors.phone}
            required
          />
          <F
            label="E-mail *"
            type="email"
            value={form.email}
            onChange={(v) => update("email", v)}
            placeholder="voce@email.com"
            autoComplete="email"
            error={errors.email}
            required
          />
          <div className="grid grid-cols-[1fr_80px] gap-3">
            <F label="Cidade" value={form.city} onChange={(v) => update("city", v)} autoComplete="address-level2" />
            <F
              label="Estado"
              value={form.state}
              onChange={(v) => update("state", v.replace(/[^a-zA-Z]/g, "").toUpperCase().slice(0, 2))}
              placeholder="UF"
              maxLength={2}
              autoComplete="address-level1"
            />
          </div>
          <F
            label="Senha *"
            type="password"
            value={form.password}
            onChange={(v) => update("password", v)}
            autoComplete="new-password"
            error={errors.password}
            required
          />
          <p className="text-xs text-muted-foreground -mt-2">
            Mínimo 8 caracteres. Evite senhas comuns (ex.: 12345678, senha123) — elas são bloqueadas por segurança.
          </p>
          <F
            label="Confirmar senha *"
            type="password"
            value={form.password2}
            onChange={(v) => update("password2", v)}
            autoComplete="new-password"
            error={errors.password2}
            required
          />
          {form.password2 && form.password && form.password === form.password2 && !errors.password2 ? (
            <p className="text-xs text-primary -mt-2">As senhas conferem ✓</p>
          ) : null}

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
          {errors.terms ? (
            <p className="text-xs text-destructive flex items-center gap-1">
              <AlertCircle className="h-3 w-3" /> {errors.terms}
            </p>
          ) : null}

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
  error,
  ...rest
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  error?: string | null;
} & Omit<React.ComponentProps<"input">, "value" | "onChange">) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      <Input
        className={`h-12 ${error ? "border-destructive focus-visible:ring-destructive" : ""}`}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-invalid={error ? true : undefined}
        {...rest}
      />
      {error ? (
        <p className="text-xs text-destructive flex items-center gap-1">
          <AlertCircle className="h-3 w-3" /> {error}
        </p>
      ) : null}
    </div>
  );
}
