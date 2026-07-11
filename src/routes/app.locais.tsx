import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { MapPin, Plus, Edit, Loader2, Trash2, Save, X } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/app/locais")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Locais de atuação — MiniCar Gestão" },
      { name: "description", content: "Cadastre e gerencie os locais onde seus veículos operam." },
    ],
  }),
  component: LocaisPage,
});

type Location = {
  id: string;
  name: string;
  address: string | null;
  city: string | null;
  state: string | null;
  notes: string | null;
  is_active: boolean;
};

type FormState = {
  id?: string;
  name: string;
  address: string;
  city: string;
  state: string;
  notes: string;
  is_active: boolean;
};

const emptyForm: FormState = {
  name: "", address: "", city: "", state: "", notes: "", is_active: true,
};

function LocaisPage() {
  const qc = useQueryClient();
  const [editing, setEditing] = useState<FormState | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<Location | null>(null);

  const { data: locations, isLoading } = useQuery({
    queryKey: ["locations"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("locations")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Location[];
    },
  });

  const saveMut = useMutation({
    mutationFn: async (f: FormState) => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) throw new Error("Sessão inválida");
      const payload = {
        name: f.name.trim(),
        address: f.address.trim() || null,
        city: f.city.trim() || null,
        state: f.state.trim().toUpperCase() || null,
        notes: f.notes.trim() || null,
        is_active: f.is_active,
      };
      if (f.id) {
        const { error } = await supabase.from("locations").update(payload).eq("id", f.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("locations").insert({ ...payload, user_id: u.user.id });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success(editing?.id ? "Local atualizado" : "Local criado");
      setEditing(null);
      qc.invalidateQueries({ queryKey: ["locations"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteMut = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("locations").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Local removido");
      setConfirmDelete(null);
      qc.invalidateQueries({ queryKey: ["locations"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <AppShell title="Locais de atuação">
      <div className="space-y-4">
        <Button className="w-full h-12 gap-2 font-semibold" onClick={() => setEditing({ ...emptyForm })}>
          <Plus className="h-5 w-5" /> Novo local
        </Button>

        {isLoading ? (
          <div className="flex justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
        ) : !locations?.length ? (
          <Card className="p-8 text-center space-y-2">
            <MapPin className="h-8 w-8 mx-auto text-muted-foreground" />
            <div className="font-semibold">Nenhum local cadastrado</div>
            <div className="text-sm text-muted-foreground">
              Cadastre praças, parques, festas e outros pontos onde seus veículos operam.
            </div>
          </Card>
        ) : (
          <div className="space-y-3">
            {locations.map((l) => (
              <Card key={l.id} className="p-4">
                <div className="flex gap-3">
                  <div className="h-12 w-12 rounded-xl bg-primary-soft text-primary grid place-items-center shrink-0">
                    <MapPin className="h-5 w-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="font-semibold truncate">{l.name}</div>
                        <div className="text-xs text-muted-foreground truncate">
                          {[l.city, l.state].filter(Boolean).join("/") || "Sem cidade informada"}
                        </div>
                        {l.address && (
                          <div className="text-xs text-muted-foreground truncate mt-0.5">{l.address}</div>
                        )}
                      </div>
                      <Badge
                        variant="outline"
                        className={
                          l.is_active
                            ? "bg-success/15 text-success border-success/30"
                            : "bg-muted text-muted-foreground"
                        }
                      >
                        {l.is_active ? "Ativo" : "Inativo"}
                      </Badge>
                    </div>
                    <div className="flex gap-4 mt-3">
                      <button
                        className="inline-flex items-center gap-1 text-xs text-primary font-medium"
                        onClick={() =>
                          setEditing({
                            id: l.id,
                            name: l.name,
                            address: l.address ?? "",
                            city: l.city ?? "",
                            state: l.state ?? "",
                            notes: l.notes ?? "",
                            is_active: l.is_active,
                          })
                        }
                      >
                        <Edit className="h-3.5 w-3.5" /> Editar
                      </button>
                      <button
                        className="inline-flex items-center gap-1 text-xs text-destructive font-medium"
                        onClick={() => setConfirmDelete(l)}
                      >
                        <Trash2 className="h-3.5 w-3.5" /> Remover
                      </button>
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editing?.id ? "Editar local" : "Novo local"}</DialogTitle>
          </DialogHeader>
          {editing && (
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label>Nome *</Label>
                <Input
                  className="h-11"
                  placeholder="Praça Central, Shopping Norte..."
                  value={editing.name}
                  onChange={(e) => setEditing({ ...editing, name: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Endereço</Label>
                <Input
                  className="h-11"
                  value={editing.address}
                  onChange={(e) => setEditing({ ...editing, address: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-[1fr_80px] gap-3">
                <div className="space-y-1.5">
                  <Label>Cidade</Label>
                  <Input
                    className="h-11"
                    value={editing.city}
                    onChange={(e) => setEditing({ ...editing, city: e.target.value })}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>UF</Label>
                  <Input
                    className="h-11"
                    value={editing.state}
                    onChange={(e) => setEditing({ ...editing, state: e.target.value.slice(0, 2) })}
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Observações</Label>
                <Textarea
                  rows={3}
                  value={editing.notes}
                  onChange={(e) => setEditing({ ...editing, notes: e.target.value })}
                />
              </div>
              <label className="flex items-center justify-between py-1 cursor-pointer">
                <span className="text-sm">Local ativo</span>
                <Switch
                  checked={editing.is_active}
                  onCheckedChange={(c) => setEditing({ ...editing, is_active: c })}
                />
              </label>
            </div>
          )}
          <DialogFooter className="gap-2 sm:gap-2">
            <Button variant="outline" className="h-11 gap-2" onClick={() => setEditing(null)}>
              <X className="h-4 w-4" /> Cancelar
            </Button>
            <Button
              className="h-11 gap-2 font-semibold"
              onClick={() => editing && saveMut.mutate(editing)}
              disabled={saveMut.isPending || !editing?.name.trim()}
            >
              {saveMut.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Save className="h-4 w-4" /> Salvar</>}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!confirmDelete} onOpenChange={(o) => !o && setConfirmDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover este local?</AlertDialogTitle>
            <AlertDialogDescription>
              O local "{confirmDelete?.name}" será removido. Locações passadas continuarão registradas no histórico.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => confirmDelete && deleteMut.mutate(confirmDelete.id)}
            >
              {deleteMut.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Remover"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppShell>
  );
}
