import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Loader2, Eye, EyeOff, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { BrandLogo } from "@/components/brand-logo";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/redefinir-senha")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Redefinir senha — MiniCar Gestão" },
      { name: "description", content: "Defina uma nova senha para sua conta." },
    ],
  }),
  component: RedefinirPage,
});

function RedefinirPage() {
  const [validRecovery, setValidRecovery] = useState<boolean | null>(null);
  const [password, setPassword] = useState("");
  const [password2, setPassword2] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    // Supabase preenche a sessão a partir do hash (#access_token=...&type=recovery)
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") setValidRecovery(true);
    });
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) setValidRecovery(true);
      else setTimeout(() => setValidRecovery((v) => v ?? false), 800);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 8) {
      toast.error("A senha deve ter pelo menos 8 caracteres");
      return;
    }
    if (password !== password2) {
      toast.error("As senhas não coincidem");
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    setDone(true);
    await supabase.auth.signOut();
    setTimeout(() => {
      navigate({ to: "/login", replace: true });
    }, 1200);
  };

  return (
    <div className="min-h-screen bg-background flex flex-col justify-center px-6 py-10">
      <div className="w-full max-w-sm mx-auto">
        <div className="mb-8">
          <BrandLogo size="md" />
        </div>
        {done ? (
          <div className="text-center space-y-3">
            <div className="inline-flex h-14 w-14 rounded-full bg-success/15 text-success items-center justify-center">
              <CheckCircle2 className="h-7 w-7" />
            </div>
            <h1 className="text-xl font-bold">Senha atualizada</h1>
            <p className="text-sm text-muted-foreground">Redirecionando para o login...</p>
          </div>
        ) : validRecovery === false ? (
          <div className="text-center space-y-3">
            <h1 className="text-xl font-bold">Link inválido ou expirado</h1>
            <p className="text-sm text-muted-foreground">
              Solicite um novo link de recuperação.
            </p>
            <Link to="/recuperar-senha">
              <Button className="mt-3 h-12">Pedir novo link</Button>
            </Link>
          </div>
        ) : validRecovery === null ? (
          <div className="text-center text-muted-foreground text-sm">
            <Loader2 className="h-5 w-5 animate-spin mx-auto mb-2" /> Verificando link...
          </div>
        ) : (
          <>
            <h1 className="text-2xl font-bold mb-1">Nova senha</h1>
            <p className="text-sm text-muted-foreground mb-6">
              Escolha uma senha com pelo menos 8 caracteres.
            </p>
            <form className="space-y-4" onSubmit={handleSubmit}>
              <div className="space-y-1.5">
                <Label>Nova senha</Label>
                <div className="relative">
                  <Input
                    type={showPass ? "text" : "password"}
                    className="h-12 pr-12"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPass((s) => !s)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                  >
                    {showPass ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Confirmar nova senha</Label>
                <Input
                  type={showPass ? "text" : "password"}
                  className="h-12"
                  value={password2}
                  onChange={(e) => setPassword2(e.target.value)}
                  required
                />
              </div>
              <Button className="w-full h-12 text-base font-semibold" disabled={loading}>
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Salvar nova senha"}
              </Button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
