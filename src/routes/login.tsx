import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { BrandLogo } from "@/components/brand-logo";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "Entrar — MiniCar Gestão" },
      { name: "description", content: "Acesse sua conta MiniCar Gestão para controlar suas locações de veículos elétricos infantis." },
    ],
  }),
  component: LoginPage,
});

function LoginPage() {
  const [showPass, setShowPass] = useState(false);
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background flex flex-col justify-center px-6 py-10">
      <div className="w-full max-w-sm mx-auto">
        <div className="mb-10">
          <BrandLogo size="lg" />
        </div>
        <h1 className="text-2xl font-bold text-center mb-1">Bem-vindo</h1>
        <p className="text-sm text-muted-foreground text-center mb-8">
          Entre para acompanhar suas locações
        </p>

        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            navigate({ to: "/app" });
          }}
        >
          <div className="space-y-1.5">
            <Label htmlFor="email">E-mail</Label>
            <Input id="email" type="email" placeholder="voce@email.com" className="h-12" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="senha">Senha</Label>
            <div className="relative">
              <Input
                id="senha"
                type={showPass ? "text" : "password"}
                placeholder="••••••••"
                className="h-12 pr-12"
              />
              <button
                type="button"
                onClick={() => setShowPass((s) => !s)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                aria-label={showPass ? "Ocultar senha" : "Mostrar senha"}
              >
                {showPass ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
              </button>
            </div>
          </div>
          <Button type="submit" className="w-full h-12 text-base font-semibold">
            Entrar
          </Button>
        </form>

        <div className="mt-6 flex flex-col items-center gap-2 text-sm">
          <Link to="/recuperar-senha" className="text-primary font-medium">
            Esqueci minha senha
          </Link>
          <div className="text-muted-foreground">
            Não tem conta?{" "}
            <Link to="/cadastro" className="text-primary font-semibold">
              Criar minha conta
            </Link>
          </div>
        </div>

        <div className="mt-10 pt-6 border-t text-center">
          <Link
            to="/admin"
            className="text-xs text-muted-foreground hover:text-foreground"
          >
            Acesso administrativo
          </Link>
        </div>
      </div>
    </div>
  );
}
