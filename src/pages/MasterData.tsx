import { useMemo, useRef, useState } from "react";
import { Edit, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useCategories, useCreateCategory, useDeleteCategory, useUpdateCategory } from "@/hooks/useCategories";
import {
  useCreateFinishing,
  useCreateFrame,
  useCreateServiceMaterial,
  useCreateUnit,
  useDeleteFinishing,
  useDeleteFrame,
  useDeleteServiceMaterial,
  useDeleteUnit,
  useFinishings,
  useFrames,
  useServiceMaterials,
  useUnits,
  useUpdateFinishing,
  useUpdateFrame,
  useUpdateServiceMaterial,
  useUpdateUnit,
} from "@/hooks/useMasters";
import type { FinishingMaster, FrameMaster, ProductCategory, ServiceMaterialMaster, UnitMaster } from "@/types";

type MasterDataType = "categories" | "units" | "finishings" | "materials" | "frames";

type MasterDataPageProps = {
  type: MasterDataType;
};

type MasterDataForm = {
  code: string;
  name: string;
  icon: string;
  isActive: boolean;
  minStock: string;
  buyPrice: string;
  stock: string;
};

type MasterDataItem = ProductCategory | UnitMaster | FinishingMaster | ServiceMaterialMaster | FrameMaster;

const emptyForm: MasterDataForm = {
  code: "",
  name: "",
  icon: "",
  isActive: true,
  minStock: "",
  buyPrice: "",
  stock: "",
};

const masterConfig: Record<
  MasterDataType,
  {
    title: string;
    description: string;
    codeLabel: string;
    hasIcon: boolean;
    hasStockFields: boolean;
  }
> = {
  categories: {
    title: "Master Kategori",
    description: "Kelola kategori produk yang dipakai di sistem.",
    codeLabel: "Kode Kategori",
    hasIcon: true,
    hasStockFields: false,
  },
  units: {
    title: "Master Satuan",
    description: "Kelola satuan default yang dipakai produk, jasa, dan display.",
    codeLabel: "Kode Satuan",
    hasIcon: false,
    hasStockFields: false,
  },
  finishings: {
    title: "Master Finishing",
    description: "Kelola daftar finishing yang bisa dipilih pada varian.",
    codeLabel: "Kode Finishing",
    hasIcon: false,
    hasStockFields: false,
  },
  materials: {
    title: "Master Material Jasa",
    description: "Kelola material yang dipakai untuk katalog jasa.",
    codeLabel: "Kode Material",
    hasIcon: false,
    hasStockFields: false,
  },
  frames: {
    title: "Master Rangka",
    description: "Kelola rangka display beserta informasi stok.",
    codeLabel: "Kode Rangka",
    hasIcon: false,
    hasStockFields: true,
  },
};

const parseOptionalInteger = (value: string): number | undefined => {
  const text = value.trim();
  if (!text) return undefined;
  if (!/^\d+$/.test(text)) return Number.NaN;
  return Number(text);
};

const sanitizeDigits = (value: string): string => value.replace(/\D/g, "");

const toIntegerFormValue = (value: unknown): string => {
  if (value === null || value === undefined) return "";
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return "";
  return String(Math.max(Math.round(parsed), 0));
};

const formatRupiahFromDigits = (value: string): string => {
  const digits = sanitizeDigits(value);
  if (!digits) return "";
  return `Rp ${Number(digits).toLocaleString("id-ID")}`;
};

export default function MasterDataPage({ type }: MasterDataPageProps) {
  const config = masterConfig[type];
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<MasterDataItem | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingItem, setDeletingItem] = useState<MasterDataItem | null>(null);
  const [form, setForm] = useState<MasterDataForm>(emptyForm);
  const nameInputRef = useRef<HTMLInputElement | null>(null);

  const categoriesQuery = useCategories({ activeOnly: false, search });
  const unitsQuery = useUnits({ activeOnly: false, search });
  const finishingsQuery = useFinishings({ activeOnly: false, search });
  const serviceMaterialsQuery = useServiceMaterials({ activeOnly: false, search });
  const framesQuery = useFrames({ activeOnly: false, search });

  const createCategory = useCreateCategory();
  const updateCategory = useUpdateCategory();
  const deleteCategory = useDeleteCategory();
  const createUnit = useCreateUnit();
  const updateUnit = useUpdateUnit();
  const deleteUnit = useDeleteUnit();
  const createFinishing = useCreateFinishing();
  const updateFinishing = useUpdateFinishing();
  const deleteFinishing = useDeleteFinishing();
  const createServiceMaterial = useCreateServiceMaterial();
  const updateServiceMaterial = useUpdateServiceMaterial();
  const deleteServiceMaterial = useDeleteServiceMaterial();
  const createFrame = useCreateFrame();
  const updateFrame = useUpdateFrame();
  const deleteFrame = useDeleteFrame();

  const activeQuery = useMemo(() => {
    if (type === "categories") return categoriesQuery;
    if (type === "units") return unitsQuery;
    if (type === "finishings") return finishingsQuery;
    if (type === "materials") return serviceMaterialsQuery;
    return framesQuery;
  }, [type, categoriesQuery, unitsQuery, finishingsQuery, serviceMaterialsQuery, framesQuery]);

  const rows = useMemo(() => (activeQuery.data ?? []) as MasterDataItem[], [activeQuery.data]);

  const isMutating =
    createCategory.isPending ||
    updateCategory.isPending ||
    deleteCategory.isPending ||
    createUnit.isPending ||
    updateUnit.isPending ||
    deleteUnit.isPending ||
    createFinishing.isPending ||
    updateFinishing.isPending ||
    deleteFinishing.isPending ||
    createServiceMaterial.isPending ||
    updateServiceMaterial.isPending ||
    deleteServiceMaterial.isPending ||
    createFrame.isPending ||
    updateFrame.isPending ||
    deleteFrame.isPending;

  const openCreate = () => {
    setEditingItem(null);
    setForm({ ...emptyForm, isActive: true, icon: type === "categories" ? "box" : "" });
    setDialogOpen(true);
  };

  const openEdit = (item: MasterDataItem) => {
    setEditingItem(item);
    setForm({
      code: (item.code ?? "").toString(),
      name: item.name ?? "",
      icon: "icon" in item ? (item.icon ?? "") : "",
      isActive: item.isActive ?? true,
      minStock: "minStock" in item ? toIntegerFormValue(item.minStock) : "",
      buyPrice: "buyPrice" in item ? toIntegerFormValue(item.buyPrice) : "",
      stock: "stock" in item ? toIntegerFormValue(item.stock) : "",
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    const name = form.name.trim();
    if (!name) {
      toast.error("Nama wajib diisi");
      return;
    }

    try {
      if (type === "categories") {
        const payload = {
          name,
          icon: form.icon.trim() || "box",
          isActive: form.isActive,
        };
        if (editingItem) {
          await updateCategory.mutateAsync({ id: editingItem.id, ...payload });
          toast.success("Kategori berhasil diperbarui");
        } else {
          await createCategory.mutateAsync(payload);
          toast.success("Kategori berhasil ditambahkan");
        }
      } else if (type === "units") {
        const payload = { name, isActive: form.isActive };
        if (editingItem) {
          await updateUnit.mutateAsync({ id: editingItem.id, ...payload });
          toast.success("Satuan berhasil diperbarui");
        } else {
          await createUnit.mutateAsync(payload);
          toast.success("Satuan berhasil ditambahkan");
        }
      } else if (type === "finishings") {
        const payload = { name, isActive: form.isActive };
        if (editingItem) {
          await updateFinishing.mutateAsync({ id: editingItem.id, ...payload });
          toast.success("Finishing berhasil diperbarui");
        } else {
          await createFinishing.mutateAsync(payload);
          toast.success("Finishing berhasil ditambahkan");
        }
      } else if (type === "materials") {
        const payload = { name, isActive: form.isActive };
        if (editingItem) {
          await updateServiceMaterial.mutateAsync({ id: editingItem.id, ...payload });
          toast.success("Material jasa berhasil diperbarui");
        } else {
          await createServiceMaterial.mutateAsync(payload);
          toast.success("Material jasa berhasil ditambahkan");
        }
      } else {
        const minStock = parseOptionalInteger(form.minStock);
        const stock = parseOptionalInteger(form.stock);
        const buyPrice = parseOptionalInteger(form.buyPrice);
        if (Number.isNaN(minStock) || Number.isNaN(stock) || Number.isNaN(buyPrice)) {
          toast.error("Nilai stok/min stok/harga beli harus angka bulat valid");
          return;
        }
        const payload = {
          name,
          minStock,
          stock,
          buyPrice: buyPrice === undefined ? undefined : Math.round(buyPrice),
          isActive: form.isActive,
        };
        if (editingItem) {
          await updateFrame.mutateAsync({ id: editingItem.id, ...payload });
          toast.success("Rangka berhasil diperbarui");
        } else {
          await createFrame.mutateAsync(payload);
          toast.success("Rangka berhasil ditambahkan");
        }
      }

      setDialogOpen(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Gagal menyimpan data");
    }
  };

  const openDeleteDialog = (item: MasterDataItem) => {
    setDeletingItem(item);
    setDeleteDialogOpen(true);
  };

  const handleDelete = async () => {
    if (!deletingItem) return;
    try {
      if (type === "categories") {
        await deleteCategory.mutateAsync(deletingItem.id);
      } else if (type === "units") {
        await deleteUnit.mutateAsync(deletingItem.id);
      } else if (type === "finishings") {
        await deleteFinishing.mutateAsync(deletingItem.id);
      } else if (type === "materials") {
        await deleteServiceMaterial.mutateAsync(deletingItem.id);
      } else {
        await deleteFrame.mutateAsync(deletingItem.id);
      }
      toast.success("Data berhasil dihapus");
      setDeleteDialogOpen(false);
      setDeletingItem(null);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Gagal menghapus data");
    }
  };

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1">
          <h2 className="text-xl font-semibold text-foreground">{config.title}</h2>
          <p className="text-sm text-muted-foreground">{config.description}</p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="mr-2 h-4 w-4" />
          Tambah Data
        </Button>
      </div>

      <div className="max-w-md">
        <Input
          placeholder={`Cari ${config.title.toLowerCase()}...`}
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          className="border-primary/40 bg-background shadow-sm focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/35"
        />
      </div>

      {activeQuery.isLoading ? (
        <div className="rounded-lg border border-border bg-card p-6 text-sm text-muted-foreground">Memuat data...</div>
      ) : rows.length === 0 ? (
        <div className="rounded-lg border border-border bg-card p-6 text-sm text-muted-foreground">Data tidak ditemukan.</div>
      ) : (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
          {rows.map((item) => {
            const extra =
              type === "categories"
                ? `Ikon: ${"icon" in item ? item.icon ?? "-" : "-"}`
                : type === "frames"
                  ? `Stok: ${"stock" in item ? item.stock ?? "-" : "-"} | Min: ${"minStock" in item ? item.minStock ?? "-" : "-"} | Beli: ${"buyPrice" in item ? item.buyPrice ?? "-" : "-"}`
                  : null;
            return (
              <div key={item.id} className="rounded-lg border border-border bg-card p-4 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-xs text-muted-foreground">{item.code?.trim() || "-"}</p>
                    <p className="text-sm font-semibold text-foreground">{item.name}</p>
                  </div>
                  <span
                    className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${
                      item.isActive === false ? "bg-muted text-muted-foreground" : "bg-success/10 text-success"
                    }`}
                  >
                    {item.isActive === false ? "Nonaktif" : "Aktif"}
                  </span>
                </div>
                {extra ? <p className="text-xs text-muted-foreground">{extra}</p> : null}
                <div className="flex items-center justify-end gap-1 pt-1">
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(item)}>
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => openDeleteDialog(item)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent
          className="sm:max-w-md"
          onOpenAutoFocus={(event) => {
            event.preventDefault();
            nameInputRef.current?.focus();
          }}
        >
          <DialogHeader>
            <DialogTitle>{editingItem ? `Edit ${config.title}` : `Tambah ${config.title}`}</DialogTitle>
          </DialogHeader>

          <div className="space-y-3">
            <div className="space-y-1">
              <Label>{config.codeLabel}</Label>
              <Input
                value={editingItem ? form.code || "-" : "Otomatis"}
                readOnly
                className="bg-muted text-muted-foreground"
              />
            </div>

            <div className="space-y-1">
              <Label>Nama</Label>
              <Input
                ref={nameInputRef}
                value={form.name}
                onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
                placeholder="Nama data"
              />
            </div>

            {config.hasIcon ? (
              <div className="space-y-1">
                <Label>Ikon</Label>
                <Input value={form.icon} onChange={(event) => setForm((prev) => ({ ...prev, icon: event.target.value }))} placeholder="Contoh: box" />
              </div>
            ) : null}

            {config.hasStockFields ? (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <div className="space-y-1">
                  <Label>Stok</Label>
                  <Input
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    value={form.stock}
                    onChange={(event) => setForm((prev) => ({ ...prev, stock: sanitizeDigits(event.target.value) }))}
                    placeholder="0"
                  />
                </div>
                <div className="space-y-1">
                  <Label>Min Stok</Label>
                  <Input
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    value={form.minStock}
                    onChange={(event) => setForm((prev) => ({ ...prev, minStock: sanitizeDigits(event.target.value) }))}
                    placeholder="0"
                  />
                </div>
                <div className="space-y-1">
                  <Label>Harga Beli</Label>
                  <Input
                    type="text"
                    inputMode="numeric"
                    value={formatRupiahFromDigits(form.buyPrice)}
                    onChange={(event) => setForm((prev) => ({ ...prev, buyPrice: sanitizeDigits(event.target.value) }))}
                    placeholder="Rp 0"
                  />
                </div>
              </div>
            ) : null}

            <div className="flex items-center justify-between rounded-lg border border-border px-3 py-2">
              <Label htmlFor="master-data-active">Aktif</Label>
              <Switch
                id="master-data-active"
                checked={form.isActive}
                onCheckedChange={(checked) => setForm((prev) => ({ ...prev, isActive: checked }))}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Batal
            </Button>
            <Button onClick={handleSave} disabled={isMutating}>
              {editingItem ? "Simpan Perubahan" : "Tambah Data"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Hapus Data</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            {deletingItem ? `Data "${deletingItem.name}" akan dihapus. Lanjutkan?` : "Data akan dihapus."}
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
              Batal
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={isMutating}>
              Hapus
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
