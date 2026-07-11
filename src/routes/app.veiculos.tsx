import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Car, Plus, Edit, Loader2, Trash2, Save, X, Search, Camera, Timer,
} from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/app/veiculos")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Veículos — MiniCar Gestão" },
      { name: "description", content: "Cadastre e gerencie seus veículos elétricos infantis." },
    ],
  }),
  component: VeiculosPage,
});

type VehicleStatus = "disponivel" | "em_locacao" | "manutencao" | "inativo";

type Vehicle = {
  id: string;
  user_id: string;
  name: string;
  purchase_date: string | null;
  photo_url: string | null;
  status: VehicleStatus;
  created_at: string;
};

type FormState = {
  id?: string;
  name: string;
  purchase_date: string;
  photo_url: string | null;
  photo_file: File | null;
};

const emptyForm: FormState = {
  name: "",
  purchase_date: new Date().toISOString().slice(0, 10),
  photo_url: null,
  photo_file: null,
};

const statusMeta: Record<VehicleStatus, { label: string; className: string }> = {
  disponivel: { label: "Disponível", className: "bg-success/15 text-success border-success/30" },
  em_locacao: { label: "Em locação", className: "bg-accent/20 text-accent-foreground border-accent/40" },
  manutencao: { label: "Manutenção", className: "bg-warning/20 text-warning-foreground border-warning/40" },
  inativo: { label: "Inativo", className: "bg-muted text-muted-foreground border-border" },
};

const filters: Array<{ key: "todos" | VehicleStatus; label: string }> = [
  { key: "todos", label: "Todos" },
  { key: "disponivel", label: "Disponíveis" },
  { key: "em_locacao", label: "Em locação" },
  { key: "manutencao", label: "Manutenção" },
  { key: "inativo", label: "Inativos" },
];

function formatDateBR(iso: string | null) {
  if (!iso) return "—";
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}

function fmtCountdown(ms: number) {
  const total = Math.max(0, Math.floor(ms / 1000));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

type ActiveRental = {
  vehicle_id: string;
  planned_end_at: string;
  paused_at: string | null;
};

function VeiculosPage() {
  const qc = useQueryClient();
  const [editing, setEditing] = useState<FormState | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<Vehicle | null>(null);
  const [filter, setFilter] = useState<(typeof filters)[number]["key"]>("todos");
  const [search, setSearch] = useState("");

  const { data: vehicles, isLoading } = useQuery({
    queryKey: ["vehicles"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("vehicles")
        .select("id,user_id,name,purchase_date,photo_url,status,created_at")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Vehicle[];
    },
  });

  const { data: activeRentals } = useQuery({
    queryKey: ["vehicles-active-rentals"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("rentals")
        .select("vehicle_id,planned_end_at,paused_at")
        .eq("status", "ativa");
      if (error) throw error;
      return (data ?? []) as ActiveRental[];
    },
    refetchInterval: 15000,
  });

  const rentalByVehicle = useMemo(() => {
    const map = new Map<string, ActiveRental>();
    (activeRentals ?? []).forEach((r) => map.set(r.vehicle_id, r));
    return map;
  }, [activeRentals]);

  const [, setTick] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setTick((n) => n + 1), 1000);
    return () => clearInterval(t);
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (vehicles ?? []).filter((v) => {
      if (filter !== "todos" && v.status !== filter) return false;
      if (!q) return true;
      return v.name.toLowerCase().includes(q);
    });
  }, [vehicles, filter, search]);

  const saveMut = useMutation({
    mutationFn: async (f: FormState) => {
      const { data: u, error: userErr } = await supabase.auth.getUser();
      if (userErr || !u.user) throw new Error("Sessão inválida. Faça login novamente.");

      let photo_url = f.photo_url;
      if (f.photo_file) {
        const ext = (f.photo_file.name.split(".").pop() || "jpg").toLowerCase();
        const rand =
          typeof crypto !== "undefined" && "randomUUID" in crypto
            ? crypto.randomUUID()
            : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
        const path = `${u.user.id}/${rand}.${ext}`;
        const { error: upErr } = await supabase.storage
          .from("vehicle-photos")
          .upload(path, f.photo_file, { upsert: false, contentType: f.photo_file.type });
        if (upErr) throw new Error(`Falha ao enviar foto: ${upErr.message}`);
        photo_url = path;
      }

      const payload = {
        name: f.name.trim(),
        purchase_date: f.purchase_date || null,
        photo_url,
      };

      if (f.id) {
        const { error } = await supabase.from("vehicles").update(payload).eq("id", f.id);
        if (error) throw new Error(error.message);
      } else {
        const { error } = await supabase
          .from("vehicles")
          .insert({ ...payload, user_id: u.user.id });
        if (error) throw new Error(error.message);
      }
    },
    onSuccess: () => {
      toast.success(editing?.id ? "Veículo atualizado" : "Veículo cadastrado");
      setEditing(null);
      qc.invalidateQueries({ queryKey: ["vehicles"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteMut = useMutation({
    mutationFn: async (v: Vehicle) => {
      if (v.photo_url) {
        await supabase.storage.from("vehicle-photos").remove([v.photo_url]);
      }
      const { error } = await supabase.from("vehicles").delete().eq("id", v.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Veículo removido");
      setConfirmDelete(null);
      qc.invalidateQueries({ queryKey: ["vehicles"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <AppShell title="Veículos">
      <div className="space-y-4">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nome"
              className="h-12 pl-10"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <Button
            className="h-12 px-4"
            onClick={() => setEditing({ ...emptyForm })}
            aria-label="Novo veículo"
          >
            <Plus className="h-5 w-5" />
          </Button>
        </div>

        <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
          {filters.map((f) => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={`shrink-0 px-4 h-9 rounded-full text-sm font-medium border transition ${
                filter === f.key
                  ? "bg-foreground text-background border-foreground"
                  : "bg-card text-foreground border-border"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {isLoading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : filtered.length === 0 ? (
          <Card className="p-8 text-center space-y-2">
            <Car className="h-8 w-8 mx-auto text-muted-foreground" />
            <div className="font-semibold">
              {vehicles?.length ? "Nenhum veículo neste filtro" : "Nenhum veículo cadastrado"}
            </div>
            <div className="text-sm text-muted-foreground">
              {vehicles?.length
                ? "Ajuste o filtro ou a busca acima."
                : "Cadastre seu primeiro veículo para começar."}
            </div>
          </Card>
        ) : (
          <div className="space-y-3">
            {filtered.map((v) => (
              <VehicleCard
                key={v.id}
                v={v}
                rental={rentalByVehicle.get(v.id) ?? null}
                onEdit={() =>
                  setEditing({
                    id: v.id,
                    name: v.name,
                    purchase_date: v.purchase_date ?? "",
                    photo_url: v.photo_url,
                    photo_file: null,
                  })
                }
                onDelete={() => setConfirmDelete(v)}
              />
            ))}
          </div>
        )}
      </div>

      <Dialog open={!!editing} onOpenChange={(o) => !o && !saveMut.isPending && setEditing(null)}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing?.id ? "Editar veículo" : "Novo veículo"}</DialogTitle>
          </DialogHeader>
          {editing && (
            <VehicleForm form={editing} setForm={setEditing} />
          )}
          <DialogFooter className="gap-2 sm:gap-2">
            <Button variant="outline" className="h-11 gap-2" onClick={() => setEditing(null)} disabled={saveMut.isPending}>
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
            <AlertDialogTitle>Remover este veículo?</AlertDialogTitle>
            <AlertDialogDescription>
              O veículo "{confirmDelete?.name}" será removido. Locações passadas continuarão registradas no histórico.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => confirmDelete && deleteMut.mutate(confirmDelete)}
            >
              {deleteMut.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Remover"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppShell>
  );
}

function VehicleCard({
  v, onEdit, onDelete,
}: {
  v: Vehicle;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const meta = statusMeta[v.status] ?? statusMeta.inativo;
  const photo = usePhotoUrl(v.photo_url);
  return (
    <Card className="p-4">
      <div className="flex gap-3">
        <div className="h-16 w-16 rounded-xl bg-muted grid place-items-center shrink-0 overflow-hidden">
          {photo ? (
            <img src={photo} alt={v.name} className="h-full w-full object-cover" />
          ) : (
            <Car className="h-7 w-7 text-muted-foreground" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <div className="font-semibold truncate">{v.name}</div>
              <div className="text-xs text-muted-foreground">
                Cadastrado em {formatDateBR(v.purchase_date)}
              </div>
            </div>
            <Badge variant="outline" className={meta.className}>{meta.label}</Badge>
          </div>
          <div className="flex gap-4 mt-3">
            <button
              className="inline-flex items-center gap-1 text-xs text-primary font-medium"
              onClick={onEdit}
            >
              <Edit className="h-3.5 w-3.5" /> Editar
            </button>
            <button
              className="inline-flex items-center gap-1 text-xs text-destructive font-medium"
              onClick={onDelete}
            >
              <Trash2 className="h-3.5 w-3.5" /> Remover
            </button>
          </div>
        </div>
      </div>
    </Card>
  );
}


function VehicleForm({
  form, setForm,
}: {
  form: FormState;
  setForm: (f: FormState) => void;
}) {
  const [localPreview, setLocalPreview] = useState<string | null>(null);
  useEffect(() => {
    if (!form.photo_file) {
      setLocalPreview(null);
      return;
    }
    const url = URL.createObjectURL(form.photo_file);
    setLocalPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [form.photo_file]);

  const remotePreview = usePhotoUrl(localPreview ? null : form.photo_url);
  const preview = localPreview ?? remotePreview;

  return (
    <div className="space-y-4">
      <div className="flex flex-col items-center gap-3 py-2">
        <div className="h-28 w-28 rounded-2xl bg-muted grid place-items-center overflow-hidden">
          {preview ? (
            <img src={preview} alt="" className="h-full w-full object-cover" />
          ) : (
            <Car className="h-12 w-12 text-muted-foreground" />
          )}
        </div>
        <label className="inline-flex items-center gap-2 text-sm font-medium text-primary cursor-pointer">
          <Camera className="h-4 w-4" />
          {form.photo_url || form.photo_file ? "Trocar foto" : "Adicionar foto"}
          <input
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0] ?? null;
              setForm({ ...form, photo_file: file });
            }}
          />
        </label>
      </div>

      <div className="space-y-1.5">
        <Label>Nome do veículo *</Label>
        <Input
          className="h-11"
          placeholder="Ex: Mustang Vermelho"
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
        />
      </div>

      <div className="space-y-1.5">
        <Label>Data do cadastro</Label>
        <Input
          type="date"
          className="h-11"
          value={form.purchase_date}
          onChange={(e) => setForm({ ...form, purchase_date: e.target.value })}
        />
      </div>
    </div>
  );
}


// Assina URL do bucket privado para exibir a foto.
function usePhotoUrl(path: string | null) {
  const { data } = useQuery({
    queryKey: ["vehicle-photo", path],
    queryFn: async () => {
      if (!path) return null;
      const { data, error } = await supabase.storage
        .from("vehicle-photos")
        .createSignedUrl(path, 60 * 60);
      if (error) return null;
      return data.signedUrl;
    },
    enabled: !!path,
    staleTime: 30 * 60 * 1000,
  });
  return data ?? null;
}
