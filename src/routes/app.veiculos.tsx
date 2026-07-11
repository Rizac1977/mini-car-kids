import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Car, Plus, Edit, Loader2, Trash2, Save, X, Search, Camera,
} from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { currency } from "@/lib/mock-data";

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
  location_id: string | null;
  name: string;
  code: string | null;
  category: string | null;
  model: string | null;
  color: string | null;
  purchase_date: string | null;
  purchase_value: number | null;
  photo_url: string | null;
  notes: string | null;
  status: VehicleStatus;
};

type LocationLite = { id: string; name: string };

type FormState = {
  id?: string;
  name: string;
  code: string;
  category: string;
  model: string;
  color: string;
  purchase_date: string;
  purchase_value: string;
  location_id: string;
  status: VehicleStatus;
  notes: string;
  photo_url: string | null;
  photo_file: File | null;
};

const emptyForm: FormState = {
  name: "", code: "", category: "", model: "", color: "",
  purchase_date: "", purchase_value: "", location_id: "",
  status: "disponivel", notes: "", photo_url: null, photo_file: null,
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

const NO_LOCATION = "__none__";

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
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Vehicle[];
    },
  });

  const { data: locations } = useQuery({
    queryKey: ["locations", "lite"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("locations")
        .select("id,name")
        .eq("is_active", true)
        .order("name");
      if (error) throw error;
      return (data ?? []) as LocationLite[];
    },
  });

  const locationName = useMemo(() => {
    const m = new Map<string, string>();
    (locations ?? []).forEach((l) => m.set(l.id, l.name));
    return m;
  }, [locations]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (vehicles ?? []).filter((v) => {
      if (filter !== "todos" && v.status !== filter) return false;
      if (!q) return true;
      return (
        v.name.toLowerCase().includes(q) ||
        (v.code ?? "").toLowerCase().includes(q)
      );
    });
  }, [vehicles, filter, search]);

  const saveMut = useMutation({
    mutationFn: async (f: FormState) => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) throw new Error("Sessão inválida");

      let photo_url = f.photo_url;
      if (f.photo_file) {
        const ext = f.photo_file.name.split(".").pop() || "jpg";
        const path = `${u.user.id}/${crypto.randomUUID()}.${ext}`;
        const { error: upErr } = await supabase.storage
          .from("vehicle-photos")
          .upload(path, f.photo_file, { upsert: false });
        if (upErr) throw upErr;
        photo_url = path;
      }

      const payload = {
        name: f.name.trim(),
        code: f.code.trim() || null,
        category: f.category.trim() || null,
        model: f.model.trim() || null,
        color: f.color.trim() || null,
        purchase_date: f.purchase_date || null,
        purchase_value: f.purchase_value
          ? Number(f.purchase_value.replace(",", "."))
          : null,
        location_id: f.location_id || null,
        status: f.status,
        notes: f.notes.trim() || null,
        photo_url,
      };

      if (f.id) {
        const { error } = await supabase.from("vehicles").update(payload).eq("id", f.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("vehicles")
          .insert({ ...payload, user_id: u.user.id });
        if (error) throw error;
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
              placeholder="Buscar por nome ou código"
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
                locationName={locationName.get(v.location_id ?? "") ?? null}
                onEdit={() =>
                  setEditing({
                    id: v.id,
                    name: v.name,
                    code: v.code ?? "",
                    category: v.category ?? "",
                    model: v.model ?? "",
                    color: v.color ?? "",
                    purchase_date: v.purchase_date ?? "",
                    purchase_value: v.purchase_value != null ? String(v.purchase_value) : "",
                    location_id: v.location_id ?? "",
                    status: v.status,
                    notes: v.notes ?? "",
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
            <VehicleForm
              form={editing}
              setForm={setEditing}
              locations={locations ?? []}
            />
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
  v, locationName, onEdit, onDelete,
}: {
  v: Vehicle;
  locationName: string | null;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const meta = statusMeta[v.status];
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
              <div className="text-xs text-muted-foreground truncate">
                {[v.code, locationName ?? "Sem local"].filter(Boolean).join(" · ")}
              </div>
            </div>
            <Badge variant="outline" className={meta.className}>{meta.label}</Badge>
          </div>
          <div className="mt-3 flex items-center justify-between text-xs">
            <div className="text-muted-foreground truncate">
              {v.category || "Sem categoria"}
            </div>
            <div className="text-muted-foreground shrink-0">
              {v.purchase_value != null ? currency(Number(v.purchase_value)) : "—"}
            </div>
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
  form, setForm, locations,
}: {
  form: FormState;
  setForm: (f: FormState) => void;
  locations: LocationLite[];
}) {
  const preview = form.photo_file
    ? URL.createObjectURL(form.photo_file)
    : usePhotoUrl(form.photo_url);

  return (
    <div className="space-y-3">
      <div className="flex flex-col items-center gap-3 py-2">
        <div className="h-24 w-24 rounded-2xl bg-muted grid place-items-center overflow-hidden">
          {preview ? (
            <img src={preview} alt="" className="h-full w-full object-cover" />
          ) : (
            <Car className="h-10 w-10 text-muted-foreground" />
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
        <Label>Nome *</Label>
        <Input
          className="h-11"
          placeholder="Ex: Mustang Vermelho"
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label>Código</Label>
          <Input
            className="h-11"
            placeholder="MC-01"
            value={form.code}
            onChange={(e) => setForm({ ...form, code: e.target.value })}
          />
        </div>
        <div className="space-y-1.5">
          <Label>Cor</Label>
          <Input
            className="h-11"
            value={form.color}
            onChange={(e) => setForm({ ...form, color: e.target.value })}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label>Categoria</Label>
          <Input
            className="h-11"
            placeholder="Esportivo, jipe..."
            value={form.category}
            onChange={(e) => setForm({ ...form, category: e.target.value })}
          />
        </div>
        <div className="space-y-1.5">
          <Label>Modelo</Label>
          <Input
            className="h-11"
            value={form.model}
            onChange={(e) => setForm({ ...form, model: e.target.value })}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label>Aquisição</Label>
          <Input
            type="date"
            className="h-11"
            value={form.purchase_date}
            onChange={(e) => setForm({ ...form, purchase_date: e.target.value })}
          />
        </div>
        <div className="space-y-1.5">
          <Label>Valor (R$)</Label>
          <Input
            inputMode="decimal"
            className="h-11"
            placeholder="0,00"
            value={form.purchase_value}
            onChange={(e) => setForm({ ...form, purchase_value: e.target.value })}
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label>Local atual</Label>
        <Select
          value={form.location_id || NO_LOCATION}
          onValueChange={(v) => setForm({ ...form, location_id: v === NO_LOCATION ? "" : v })}
        >
          <SelectTrigger className="h-11">
            <SelectValue placeholder="Selecione um local" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={NO_LOCATION}>Sem local definido</SelectItem>
            {locations.map((l) => (
              <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        {locations.length === 0 && (
          <p className="text-xs text-muted-foreground">
            Você ainda não cadastrou locais. Cadastre em "Locais de atuação".
          </p>
        )}
      </div>

      <div className="space-y-1.5">
        <Label>Status</Label>
        <Select
          value={form.status}
          onValueChange={(v) => setForm({ ...form, status: v as VehicleStatus })}
        >
          <SelectTrigger className="h-11">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {(Object.keys(statusMeta) as VehicleStatus[]).map((s) => (
              <SelectItem key={s} value={s}>{statusMeta[s].label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1.5">
        <Label>Observações</Label>
        <Textarea
          rows={3}
          placeholder="Notas internas sobre o veículo"
          value={form.notes}
          onChange={(e) => setForm({ ...form, notes: e.target.value })}
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
