import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { KeyRound, Loader2, Eye, EyeOff } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { translateAuthError } from "@/lib/auth-errors";

export function ChangePasswordCard() {
  const [open, setOpen] = useState(false);
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [show, setShow] = useState(false);

  const mut = useMutation({
    mutationFn: async () => {
      if (next.length < 8) throw new Error("A nova senha precisa ter pelo menos 8 caracteres.");
      if (next !== confirm) throw new Error("A confirmação não confere com a nova senha.");
      if (next === current) throw new Error("A nova senha deve ser diferente da atual.");

      const { data: userRes } = await supabase.auth.getUser();
      const email = userRes.user?.email;
      if (!email) throw new Error("Sessão inválida. Faça login novamente.");

      const { error: signInErr } = await supabase.auth.signInWithPassword({
        email,
        password: current,
      });
      if (signInErr) throw new Error("Senha atual incorreta.");

      const { error } = await supabase.auth.updateUser({ password: next });
      if (error) throw new Error(translateAuthError(error.message));
    },
    onSuccess: () => {
      toast.success("Senha alterada com sucesso");
      setCurrent("");
      setNext("");
      setConfirm("");
      setOpen(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (!open) {
    return (
      <Card
        className="p-4 flex items-center gap-3 cursor-pointer hover:bg-muted/40 transition-colors"
        onClick={() => setOpen(true)}
      >
        <div className="h-10 w-10 rounded-xl bg-primary-soft grid place-items-center">
          <KeyRound className="h-5 w-5 text-primary" />
        </div>
        <div className="flex-1">
          <div className="font-semibold text-sm">Trocar senha</div>
          <div className="text-xs text-muted-foreground">
            Atualize a senha de acesso à sua conta
          </div>
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <KeyRound className="h-4 w-4 text-primary" />
          <h2 className="font-bold text-sm">Trocar senha</h2>
        </div>
        <button
          type="button"
          onClick={() => setShow((s) => !s)}
          className="text-xs text-muted-foreground inline-flex items-center gap-1 hover:text-foreground"
        >
          {show ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
          {show ? "Ocultar" : "Mostrar"}
        </button>
      </div>

      <div className="space-y-1.5">
        <Label>Senha atual</Label>
        <Input
          className="h-11"
          type={show ? "text" : "password"}
          value={current}
          onChange={(e) => setCurrent(e.target.value)}
          autoComplete="current-password"
        />
      </div>
      <div className="space-y-1.5">
        <Label>Nova senha</Label>
        <Input
          className="h-11"
          type={show ? "text" : "password"}
          value={next}
          onChange={(e) => setNext(e.target.value)}
          autoComplete="new-password"
          placeholder="Mínimo 8 caracteres"
        />
      </div>
      <div className="space-y-1.5">
        <Label>Confirmar nova senha</Label>
        <Input
          className="h-11"
          type={show ? "text" : "password"}
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          autoComplete="new-password"
        />
      </div>

      <div className="flex gap-2 pt-1">
        <Button
          variant="outline"
          className="flex-1 h-11"
          onClick={() => {
            setOpen(false);
            setCurrent("");
            setNext("");
            setConfirm("");
          }}
          disabled={mut.isPending}
        >
          Cancelar
        </Button>
        <Button
          className="flex-1 h-11 gap-2 font-semibold"
          onClick={() => mut.mutate()}
          disabled={mut.isPending || !current || !next || !confirm}
        >
          {mut.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Salvar"}
        </Button>
      </div>
    </Card>
  );
}
