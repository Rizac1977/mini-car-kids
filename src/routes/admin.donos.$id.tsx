import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { ownersList, currency, dateBR, vehicles, locations, history } from "@/lib/mock-data";
import { ArrowLeft, Mail, Phone, MapPin, CheckCircle2, XCircle, Pause, Plus } from "lucide-react";
import { AdminShell } from "./admin.index";

export const Route = createFileRoute("/admin/donos/$id")({
  head: ({ params }) => ({
    meta: [
      { title: `Dono ${params.id} — Admin` },
      { name: "description", content: "Detalhes do dono cadastrado na plataforma." },
    ],
  }),
  loader: ({ params }) => {
    const owner = ownersList.find((o) => o.id === params.id);
    if (!owner) throw notFound();
    return { owner };
  },
  component: DonoDetailPage,
  notFoundComponent: () => (
    <div className="p-10 text-center text-muted-foreground">Dono não encontrado.</div>
  ),
});

function DonoDetailPage() {
  const { owner } = Route.useLoaderData();
  return (
    <AdminShell title="Detalhes do dono">
      <Link to="/admin/donos" className="inline-flex items-center gap-1 text-sm text-muted-foreground mb-4">
        <ArrowLeft className="h-4 w-4" /> Voltar
      </Link>

      <Card className="p-5 mb-4">
        <div className="flex items-start gap-4">
          <div className="h-14 w-14 rounded-full bg-primary text-primary-foreground grid place-items-center font-bold text-lg shrink-0">
            {owner.name.split(" ").map((n) => n[0]).slice(0, 2).join("")}
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-bold text-lg truncate">{owner.name}</div>
            <div className="text-sm text-muted-foreground truncate">{owner.business}</div>
            <div className="mt-2 flex flex-wrap gap-2">
              <Badge variant="outline" className="bg-success/15 text-success border-success/30 capitalize">
                {owner.status}
              </Badge>
              <Badge variant="outline" className="capitalize">
                Assinatura: {owner.subscription}
              </Badge>
            </div>
          </div>
        </div>
        <div className="mt-4 pt-4 border-t space-y-2 text-sm">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Mail className="h-4 w-4" /> contato@{owner.id}.com.br
          </div>
          <div className="flex items-center gap-2 text-muted-foreground">
            <Phone className="h-4 w-4" /> (31) 99000-0000
          </div>
          <div className="flex items-center gap-2 text-muted-foreground">
            <MapPin className="h-4 w-4" /> {owner.city}/{owner.state}
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-3 gap-2 mb-4">
        <Button variant="outline" className="h-11 gap-1 text-success border-success/40">
          <CheckCircle2 className="h-4 w-4" /> Aprovar
        </Button>
        <Button variant="outline" className="h-11 gap-1 text-warning-foreground border-warning/40">
          <Pause className="h-4 w-4" /> Suspender
        </Button>
        <Button variant="outline" className="h-11 gap-1 text-destructive border-destructive/40">
          <XCircle className="h-4 w-4" /> Recusar
        </Button>
      </div>

      <Tabs defaultValue="overview">
        <TabsList className="w-full grid grid-cols-4 h-auto">
          <TabsTrigger value="overview" className="text-xs py-2">Visão</TabsTrigger>
          <TabsTrigger value="sub" className="text-xs py-2">Assinatura</TabsTrigger>
          <TabsTrigger value="vehicles" className="text-xs py-2">Veículos</TabsTrigger>
          <TabsTrigger value="log" className="text-xs py-2">Histórico</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-4 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <Card className="p-4">
              <div className="text-xs text-muted-foreground">Veículos</div>
              <div className="text-xl font-bold">{vehicles.length}</div>
            </Card>
            <Card className="p-4">
              <div className="text-xs text-muted-foreground">Locais</div>
              <div className="text-xl font-bold">{locations.length}</div>
            </Card>
            <Card className="p-4">
              <div className="text-xs text-muted-foreground">Locações totais</div>
              <div className="text-xl font-bold">{history.length * 12}</div>
            </Card>
            <Card className="p-4">
              <div className="text-xs text-muted-foreground">Faturamento</div>
              <div className="text-xl font-bold text-primary">{currency(4870)}</div>
            </Card>
          </div>
          <div className="text-xs text-muted-foreground">
            Entrou na plataforma em {dateBR(owner.joined)}
          </div>
        </TabsContent>

        <TabsContent value="sub" className="mt-4 space-y-3">
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs text-muted-foreground">Status</div>
                <div className="font-bold capitalize">{owner.subscription}</div>
              </div>
              <Button size="sm" className="gap-1">
                <Plus className="h-3.5 w-3.5" /> Adicionar dias
              </Button>
            </div>
          </Card>
          <Card className="p-4 text-sm space-y-2">
            <div className="flex justify-between"><span className="text-muted-foreground">Início</span><span>{dateBR(owner.joined)}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Vencimento</span><span>15/12/2025</span></div>
          </Card>
        </TabsContent>

        <TabsContent value="vehicles" className="mt-4 space-y-2">
          {vehicles.slice(0, 4).map((v) => (
            <Card key={v.id} className="p-3 flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-muted grid place-items-center text-xl">{v.photo}</div>
              <div className="flex-1 text-sm">
                <div className="font-semibold">{v.name}</div>
                <div className="text-xs text-muted-foreground">{v.location}</div>
              </div>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="log" className="mt-4 space-y-2">
          {[
            { date: "10/07/2026", action: "Assinatura estendida por 30 dias" },
            { date: "15/11/2024", action: "Cadastro aprovado" },
            { date: "15/11/2024", action: "Conta criada" },
          ].map((l) => (
            <Card key={l.date + l.action} className="p-3 text-sm">
              <div className="font-medium">{l.action}</div>
              <div className="text-xs text-muted-foreground">{l.date} · admin@minicar.com</div>
            </Card>
          ))}
        </TabsContent>
      </Tabs>
    </AdminShell>
  );
}
