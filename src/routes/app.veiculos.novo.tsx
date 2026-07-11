import { createFileRoute, Link } from "@tanstack/react-router";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { ArrowLeft, Camera } from "lucide-react";

export const Route = createFileRoute("/app/veiculos/novo")({
  head: () => ({
    meta: [
      { title: "Novo veículo — MiniCar Gestão" },
      { name: "description", content: "Cadastre um novo veículo elétrico infantil." },
    ],
  }),
  component: NovoVeiculoPage,
});

function NovoVeiculoPage() {
  return (
    <AppShell title="Novo veículo">
      <Link to="/app/veiculos" className="inline-flex items-center gap-1 text-sm text-muted-foreground mb-4">
        <ArrowLeft className="h-4 w-4" /> Voltar
      </Link>
      <form className="space-y-4">
        <Card className="p-6 flex flex-col items-center gap-3">
          <div className="h-28 w-28 rounded-2xl bg-muted grid place-items-center text-5xl">
            🚗
          </div>
          <Button type="button" variant="outline" className="gap-2">
            <Camera className="h-4 w-4" /> Adicionar foto
          </Button>
        </Card>

        <F label="Nome do veículo *" placeholder="Ex: Mustang Vermelho" />
        <F label="Código interno" placeholder="Opcional" />
        <div className="grid grid-cols-2 gap-3">
          <F label="Categoria" placeholder="Ex: Esportivo" />
          <F label="Modelo" placeholder="Opcional" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <F label="Cor" placeholder="Vermelho" />
          <F label="Data de aquisição" type="date" />
        </div>
        <F label="Valor de aquisição" placeholder="R$ 0,00" />
        <div className="space-y-1.5">
          <Label>Local atual *</Label>
          <select className="w-full h-12 rounded-md border border-input bg-background px-3 text-sm">
            <option>Praça Central</option>
            <option>Shopping Vale</option>
            <option>Parque das Águas</option>
          </select>
        </div>
        <div className="space-y-1.5">
          <Label>Observações</Label>
          <Textarea placeholder="Notas internas sobre o veículo" rows={3} />
        </div>

        <div className="flex gap-3 pt-2">
          <Button variant="outline" className="flex-1 h-12">
            Cancelar
          </Button>
          <Button className="flex-1 h-12 font-semibold">Salvar</Button>
        </div>
      </form>
    </AppShell>
  );
}

function F({ label, ...rest }: { label: string } & React.ComponentProps<"input">) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      <Input className="h-12" {...rest} />
    </div>
  );
}
