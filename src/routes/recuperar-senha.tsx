import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { BrandLogo } from "@/components/brand-logo";
import { ArrowLeft } from "lucide-react";

export const Route = createFileRoute("/recuperar-senha")({
  head: () => ({
    meta: [
      { title: "Recuperar senha — MiniCar Gestão" },
      { name: "description", content: "Recupere o acesso à sua conta MiniCar Gestão." },
    ],
  }),
  component: RecuperarPage,
});

function RecuperarPage() {
  return (
    <div className="min-h-screen bg-background flex flex-col justify-center px-6 py-10">
      <div className="w-full max-w-sm mx-auto">
        <Link to="/login" className="inline-flex items-center gap-1 text-sm text-muted-foreground mb-6">
          <ArrowLeft className="h-4 w-4" /> Voltar para login
        </Link>
        <div className="mb-8">
          <BrandLogo size="md" />
        </div>
        <h1 className="text-2xl font-bold mb-1">Recuperar senha</h1>
        <p className="text-sm text-muted-foreground mb-6">
          Informe o e-mail cadastrado. Enviaremos um link para você redefinir sua senha.
        </p>
        <form className="space-y-4">
          <div className="space-y-1.5">
            <Label>E-mail</Label>
            <Input type="email" placeholder="voce@email.com" className="h-12" />
          </div>
          <Button className="w-full h-12 text-base font-semibold">Enviar link</Button>
        </form>
      </div>
    </div>
  );
}
