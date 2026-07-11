import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { BrandLogo } from "@/components/brand-logo";
import { ArrowLeft } from "lucide-react";

export const Route = createFileRoute("/cadastro")({
  head: () => ({
    meta: [
      { title: "Criar conta — MiniCar Gestão" },
      { name: "description", content: "Cadastre-se para gerenciar seus veículos elétricos infantis com controle de tempo, valores e histórico." },
    ],
  }),
  component: CadastroPage,
});

function CadastroPage() {
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

        <form className="space-y-4">
          <Field label="Nome completo" placeholder="Seu nome" />
          <Field label="Nome comercial (opcional)" placeholder="Ex: MiniCarros do Carlinhos" />
          <Field label="Telefone" placeholder="(00) 00000-0000" />
          <Field label="E-mail" type="email" placeholder="voce@email.com" />
          <div className="grid grid-cols-2 gap-3">
            <Field label="Cidade" placeholder="Cidade" />
            <Field label="Estado" placeholder="UF" />
          </div>
          <Field label="Senha" type="password" placeholder="Crie uma senha" />
          <Field label="Confirmar senha" type="password" placeholder="Repita a senha" />

          <label className="flex items-start gap-2 text-sm pt-2">
            <Checkbox className="mt-0.5" />
            <span className="text-muted-foreground">
              Aceito os <span className="text-primary font-medium">termos de uso</span> e a{" "}
              <span className="text-primary font-medium">política de privacidade</span>.
            </span>
          </label>

          <Button className="w-full h-12 text-base font-semibold mt-2">Criar conta</Button>
        </form>

        <p className="text-xs text-muted-foreground text-center mt-6">
          Novos cadastros passam por aprovação do administrador.
        </p>
      </div>
    </div>
  );
}

function Field({ label, ...rest }: { label: string } & React.ComponentProps<"input">) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      <Input className="h-12" {...rest} />
    </div>
  );
}
