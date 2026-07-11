import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { Loader2, ArrowLeft, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { BrandLogo } from "@/components/brand-logo";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/recuperar-senha")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Recuperar senha — MiniCar Gestão" },
      { name: "description", content: "Recupere o acesso à sua conta MiniCar Gestão." },
    ],
  }),
  component: RecuperarPage,
});

function RecuperarPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/redefinir-senha`,
    });
    setLoading(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    setSent(true);
  };

  return (
    <div className="min-h-screen bg-background flex flex-col justify-center px-6 py-10">
      <div className="w-full max-w-sm mx-auto">
        <Link to="/login" className="inline-flex items-center gap-1 text-sm text-muted-foreground mb-6">
          <ArrowLeft className="h-4 w-4" /> Voltar para login
        </Link>
        <div className="mb-8">
          <BrandLogo size="md" />
        </div>
        {sent ? (
          <div className="text-center space-y-3">
            <div className="inline-flex h-14 w-14 rounded-full bg-success/15 text-success items-center justify-center">
              <CheckCircle2 className="h-7 w-7" />
            </div>
            <h1 className="text-xl font-bold">Link enviado</h1>
            <p className="text-sm text-muted-foreground">
              Se o e-mail estiver cadastrado, você receberá um link para redefinir sua senha.
            </p>
          </div>
        ) : (
          <>
            <h1 className="text-2xl font-bold mb-1">Recuperar senha</h1>
            <p className="text-sm text-muted-foreground mb-6">
              Informe o e-mail cadastrado. Enviaremos um link para você redefinir sua senha.
            </p>
            <form className="space-y-4" onSubmit={handleSubmit}>
              <div className="space-y-1.5">
                <Label>E-mail</Label>
                <Input
                  type="email"
                  placeholder="voce@email.com"
                  className="h-12"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              <Button className="w-full h-12 text-base font-semibold" disabled={loading}>
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Enviar link"}
              </Button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
