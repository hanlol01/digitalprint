import { useMemo, useState } from "react";
import { AlertTriangle, Edit, Package, Plus, RefreshCw, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCreateMaterial, useDeleteMaterial, useMaterials, useUpdateMaterial } from "@/hooks/useMaterials";
import { formatCurrency } from "@/lib/format";
import { toast } from "sonner";
import type { MaterialStock } from "@/types";

const emptyMaterial: Omit<MaterialStock, "id"> = {
  name: "",
  unit: "",
  costPrice: 0,
  sellingPrice: 0,
  currentStock: 0,
  minStock: 0,
  lastRestocked: new Date().toISOString(),
  isActive: true,
};

const parseCurrencyInput = (value: string): number => {
  const digits = value.replace(/\D/g, "");
  if (!digits) return 0;
  return Number(digits);
};

const formatCurrencyInput = (value: number): string => {
  if (!value) return "";
  return value.toLocaleString("id-ID");
};

export default function Materials() {
  const [searchQuery, setSearchQuery] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [submitAttempted, setSubmitAttempted] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editingMaterial, setEditingMaterial] = useState<MaterialStock | null>(null);
  const [deletingMaterial, setDeletingMaterial] = useState<MaterialStock | null>(null);
  const [form, setForm] = useState<Omit<MaterialStock, "id">>(emptyMaterial);

  const { data: materials = [], isLoading } = useMaterials();
  const createMaterial = useCreateMaterial();
  const updateMaterial = useUpdateMaterial();
  const deleteMaterial = useDeleteMaterial();

  const filteredMaterials = useMemo(() => {
    const keyword = searchQuery.trim().toLowerCase();
    if (!keyword) return materials;
    return materials.filter((item) => item.name.toLowerCase().includes(keyword) || item.unit.toLowerCase().includes(keyword));
  }, [materials, searchQuery]);

  const lowStock = useMemo(() => materials.filter((item) => item.currentStock <= item.minStock), [materials]);
  const isSellingBelowCost = form.sellingPrice < form.costPrice;
  const isPriceMissing = form.costPrice <= 0 || form.sellingPrice <= 0;

  const openCreate = () => {
    setEditingMaterial(null);
    setForm({ ...emptyMaterial, lastRestocked: new Date().toISOString() });
    setSubmitAttempted(false);
    setDialogOpen(true);
  };

  const openEdit = (material: MaterialStock) => {
    setEditingMaterial(material);
    setForm({
      name: material.name,
      unit: material.unit,
      costPrice: material.costPrice ?? 0,
      sellingPrice: material.sellingPrice ?? 0,
      currentStock: material.currentStock,
      minStock: material.minStock,
      lastRestocked: material.lastRestocked,
      isActive: material.isActive,
    });
    setSubmitAttempted(false);
    setDialogOpen(true);
  };

  const handleSave = async () => {
    setSubmitAttempted(true);
    if (!form.name.trim()) {
      toast.error("Nama bahan wajib diisi");
      return;
    }
    if (!form.unit.trim()) {
      toast.error("Satuan wajib diisi");
      return;
    }
    if (isPriceMissing) {
      toast.error("Harga modal dan harga jual wajib diisi");
      return;
    }
    if (form.currentStock < 0 || form.minStock < 0 || form.costPrice < 0 || form.sellingPrice < 0) {
      toast.error("Nilai stok dan harga tidak boleh kurang dari 0");
      return;
    }
    if (isSellingBelowCost) {
      toast.error("Harga jual tidak boleh lebih kecil dari harga modal");
      return;
    }

    try {
      if (editingMaterial) {
        await updateMaterial.mutateAsync({
          id: editingMaterial.id,
          name: form.name,
          unit: form.unit,
          costPrice: form.costPrice,
          sellingPrice: form.sellingPrice,
          minStock: form.minStock,
          lastRestocked: form.lastRestocked,
          isActive: form.isActive,
        });
        toast.success("Bahan berhasil diperbarui");
      } else {
        await createMaterial.mutateAsync({
          name: form.name,
          unit: form.unit,
          costPrice: form.costPrice,
          sellingPrice: form.sellingPrice,
          currentStock: form.currentStock,
          minStock: form.minStock,
          lastRestocked: form.lastRestocked,
          isActive: form.isActive,
        });
        toast.success("Bahan berhasil ditambahkan");
      }
      setDialogOpen(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Gagal menyimpan bahan");
    }
  };

  const handleDelete = async () => {
    if (!deletingMaterial) return;
    try {
      await deleteMaterial.mutateAsync(deletingMaterial.id);
      toast.success("Bahan berhasil dihapus");
      setDeleteDialogOpen(false);
      setDeletingMaterial(null);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Gagal menghapus bahan");
    }
  };

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
        <div className="w-full sm:max-w-xs">
          <Input
            placeholder="Cari bahan..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="bg-white"
          />
        </div>
        <Button onClick={openCreate} className="gap-2">
          <Plus className="w-4 h-4" /> Tambah Bahan
        </Button>
      </div>

      {lowStock.length > 0 && (
        <div className="bg-warning/10 border border-warning/30 rounded-xl p-4 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-warning shrink-0 mt-0.5" />
          <div>
            <h4 className="font-semibold text-foreground text-sm">Stok Menipis!</h4>
            <p className="text-sm text-muted-foreground">{lowStock.map((item) => item.name).join(", ")} memerlukan restok segera.</p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
        {isLoading && <div className="text-sm text-muted-foreground">Memuat bahan...</div>}
        {!isLoading && filteredMaterials.length === 0 && <div className="text-sm text-muted-foreground">Bahan tidak ditemukan.</div>}
        {!isLoading &&
          filteredMaterials.map((material) => {
            const isLow = material.currentStock <= material.minStock;
            const percentage = Math.min(100, (material.currentStock / Math.max(material.minStock * 3, 1)) * 100);
            return (
              <div key={material.id} className={`stat-card group ${isLow ? "border-warning/50" : ""}`}>
                <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Package className={`w-5 h-5 ${isLow ? "text-warning" : "text-primary"}`} />
                  <h4 className="font-semibold text-foreground text-sm">{material.name}</h4>
                </div>
                  <div className="flex items-center gap-1">
                    {isLow && <AlertTriangle className="w-4 h-4 text-warning" />}
                    <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(material)}>
                        <Edit className="w-3.5 h-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-destructive hover:text-destructive"
                        onClick={() => {
                          setDeletingMaterial(material);
                          setDeleteDialogOpen(true);
                        }}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2 mb-2 text-xs">
                  <p className="text-muted-foreground">Modal: {formatCurrency(material.costPrice ?? 0)}</p>
                  <p className="text-right text-muted-foreground">Jual: {formatCurrency(material.sellingPrice ?? 0)}</p>
                </div>
                <div className="flex items-end justify-between mb-2">
                  <div>
                    <p className="text-2xl font-bold text-foreground">{material.currentStock}</p>
                    <p className="text-xs text-muted-foreground">{material.unit}</p>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Min: {material.minStock} {material.unit}
                  </p>
                </div>
                <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                  <div className={`h-full rounded-full transition-all ${isLow ? "bg-warning" : "bg-primary"}`} style={{ width: `${percentage}%` }} />
                </div>
                <p className="text-[10px] text-muted-foreground mt-2 flex items-center gap-1">
                  <RefreshCw className="w-3 h-3" />
                  Restok terakhir: {new Date(material.lastRestocked).toLocaleDateString("id-ID")}
                </p>
              </div>
            );
          })}
      </div>

      <Dialog
        open={dialogOpen}
        onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) setSubmitAttempted(false);
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingMaterial ? "Edit Bahan" : "Tambah Bahan Baru"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Nama Bahan</Label>
              <Input
                value={form.name}
                onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
                placeholder="Contoh: Tinta Cyan"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Satuan</Label>
                <Input value={form.unit} onChange={(e) => setForm((prev) => ({ ...prev, unit: e.target.value }))} placeholder="ml, meter, rim" />
                {submitAttempted && !form.unit.trim() && <p className="text-xs text-destructive">Satuan wajib diisi.</p>}
              </div>
              <div className="space-y-2">
                <Label>Stok Saat Ini</Label>
                <Input
                  type="number"
                  min={0}
                  value={form.currentStock}
                  onChange={(e) => setForm((prev) => ({ ...prev, currentStock: Math.max(0, Number(e.target.value) || 0) }))}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Harga Modal</Label>
                <div className="relative">
                  <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">Rp</span>
                  <Input
                    type="text"
                    inputMode="numeric"
                    value={formatCurrencyInput(form.costPrice)}
                    onChange={(e) => setForm((prev) => ({ ...prev, costPrice: parseCurrencyInput(e.target.value) }))}
                    placeholder="Masukkan harga modal"
                    className="pl-10"
                  />
                </div>
                {submitAttempted && form.costPrice <= 0 && <p className="text-xs text-destructive">Harga modal wajib diisi.</p>}
              </div>
              <div className="space-y-2">
                <Label>Harga Jual</Label>
                <div className="relative">
                  <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">Rp</span>
                  <Input
                    type="text"
                    inputMode="numeric"
                    value={formatCurrencyInput(form.sellingPrice)}
                    onChange={(e) => setForm((prev) => ({ ...prev, sellingPrice: parseCurrencyInput(e.target.value) }))}
                    placeholder="Masukkan harga jual"
                    className="pl-10"
                  />
                </div>
                {submitAttempted && form.sellingPrice <= 0 && <p className="text-xs text-destructive">Harga jual wajib diisi.</p>}
                {submitAttempted && isSellingBelowCost && <p className="text-xs text-destructive">Harga jual harus lebih besar atau sama dengan harga modal.</p>}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Stok Minimum</Label>
                <Input
                  type="number"
                  min={0}
                  value={form.minStock}
                  onChange={(e) => setForm((prev) => ({ ...prev, minStock: Math.max(0, Number(e.target.value) || 0) }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Status Aktif</Label>
                <Select
                  value={String(form.isActive ?? true)}
                  onValueChange={(value) => setForm((prev) => ({ ...prev, isActive: value === "true" }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="true">Aktif</SelectItem>
                    <SelectItem value="false">Nonaktif</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Tanggal Restock</Label>
              <Input
                type="date"
                value={form.lastRestocked ? form.lastRestocked.slice(0, 10) : ""}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    lastRestocked: e.target.value ? new Date(`${e.target.value}T00:00:00.000Z`).toISOString() : new Date().toISOString(),
                  }))
                }
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Batal
            </Button>
            <Button onClick={handleSave} disabled={createMaterial.isPending || updateMaterial.isPending}>
              {editingMaterial ? "Simpan" : "Tambah"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Hapus Bahan</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Yakin ingin menghapus <strong className="text-foreground">{deletingMaterial?.name}</strong>?
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
              Batal
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleteMaterial.isPending}>
              Hapus
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
