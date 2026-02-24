import { useMemo, useState } from "react";
import { Edit, Plus, Search, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCategories } from "@/hooks/useCategories";
import { useProducts } from "@/hooks/useProducts";
import { useMaterials } from "@/hooks/useMaterials";
import { useCreateDisplay, useDeleteDisplay, useDisplays, useUpdateDisplay, type DisplayPayload } from "@/hooks/useDisplays";
import { useFinishings, useFrames, useUnits } from "@/hooks/useMasters";
import { formatCurrency } from "@/lib/format";
import type { DisplayCatalog } from "@/types";
import { toast } from "sonner";

const emptyForm: DisplayPayload = {
  code: "",
  name: "",
  productId: "",
  categoryId: "",
  unitId: "",
  frameId: "",
  materialId: null,
  finishingId: "",
  sellingPrice: 0,
  minimumOrder: 1,
  estimateText: "",
  isActive: true,
};
const DISPLAY_MATERIAL_NONE = "__none__";

const compareByCodeAsc = <T extends { code?: string | null }>(a: T, b: T): number => {
  const codeA = (a.code ?? "").trim();
  const codeB = (b.code ?? "").trim();
  if (codeA && codeB) return codeA.localeCompare(codeB, "en", { numeric: true, sensitivity: "base" });
  if (codeA) return -1;
  if (codeB) return 1;
  return 0;
};

export default function DisplaysPage() {
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editing, setEditing] = useState<DisplayCatalog | null>(null);
  const [deleting, setDeleting] = useState<DisplayCatalog | null>(null);
  const [form, setForm] = useState<DisplayPayload>(emptyForm);

  const { data: displays = [], isLoading } = useDisplays({ search });
  const { data: categories = [] } = useCategories({ activeOnly: true });
  const { data: products = [] } = useProducts({ activeOnly: true });
  const { data: units = [] } = useUnits({ activeOnly: true });
  const { data: frames = [] } = useFrames({ activeOnly: true });
  const { data: materials = [] } = useMaterials();
  const { data: finishings = [] } = useFinishings({ activeOnly: true });

  const createDisplay = useCreateDisplay();
  const updateDisplay = useUpdateDisplay();
  const deleteDisplay = useDeleteDisplay();

  const filteredProducts = useMemo(() => {
    if (!form.categoryId) return products;
    return products.filter((item) => item.categoryId === form.categoryId);
  }, [products, form.categoryId]);

  const sortedDisplays = useMemo(() => [...displays].sort(compareByCodeAsc), [displays]);

  const openCreate = () => {
    setEditing(null);
    setForm({
      ...emptyForm,
      categoryId: categories[0]?.id ?? "",
      productId: products[0]?.id ?? "",
      unitId: units[0]?.id ?? "",
      frameId: frames[0]?.id ?? "",
      materialId: materials[0]?.id ?? null,
      finishingId: finishings[0]?.id ?? "",
    });
    setDialogOpen(true);
  };

  const openEdit = (display: DisplayCatalog) => {
    setEditing(display);
    setForm({
      code: display.code,
      name: display.name,
      productId: display.productId,
      categoryId: display.categoryId,
      unitId: display.unitId,
      frameId: display.frameId,
      materialId: display.materialId ?? null,
      finishingId: display.finishingId,
      sellingPrice: display.sellingPrice,
      minimumOrder: display.minimumOrder,
      estimateText: display.estimateText ?? "",
      isActive: display.isActive ?? true,
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.code.trim()) return toast.error("Kode display wajib diisi");
    if (!form.name.trim()) return toast.error("Nama display wajib diisi");
    if (!form.productId || !form.categoryId || !form.unitId || !form.frameId || !form.finishingId) {
      return toast.error("Lengkapi semua relasi display");
    }
    try {
      if (editing) {
        await updateDisplay.mutateAsync({ id: editing.id, ...form, estimateText: form.estimateText || null });
        toast.success("Display berhasil diperbarui");
      } else {
        await createDisplay.mutateAsync({ ...form, estimateText: form.estimateText || null });
        toast.success("Display berhasil ditambahkan");
      }
      setDialogOpen(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Gagal menyimpan display");
    }
  };

  const handleDelete = async () => {
    if (!deleting) return;
    try {
      await deleteDisplay.mutateAsync(deleting.id);
      toast.success("Display berhasil dihapus");
      setDeleteDialogOpen(false);
      setDeleting(null);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Gagal menghapus display");
    }
  };

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Cari display..." className="pl-9 bg-card" />
        </div>
        <Button onClick={openCreate} className="gap-2">
          <Plus className="w-4 h-4" /> Tambah Display
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
        {isLoading && <div className="text-sm text-muted-foreground">Memuat display...</div>}
        {!isLoading &&
          sortedDisplays.map((display) => (
            <div key={display.id} className="stat-card group">
              <div className="flex justify-between items-start mb-2">
                <div>
                  <h4 className="font-semibold text-foreground">
                    {display.code} - {display.name}
                  </h4>
                  <p className="text-xs text-muted-foreground">{display.product?.name ?? "-"}</p>
                </div>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => openEdit(display)}>
                    <Edit className="w-4 h-4" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8 text-destructive hover:text-destructive"
                    onClick={() => {
                      setDeleting(display);
                      setDeleteDialogOpen(true);
                    }}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
              <p className="text-sm text-muted-foreground">
                {display.frame?.name ?? "-"} | {display.material?.name ?? "Tanpa Bahan"} | {display.finishing?.name ?? "-"}
              </p>
              <p className="text-xs text-muted-foreground">
                Min order: {display.minimumOrder} | {display.unit?.name}
              </p>
              <p className="text-sm font-semibold text-primary mt-2">{formatCurrency(display.sellingPrice)}</p>
            </div>
          ))}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Display" : "Tambah Display"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Kode Display</Label>
                <Input value={form.code} onChange={(e) => setForm((prev) => ({ ...prev, code: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>Nama Display</Label>
                <Input value={form.name} onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Kategori</Label>
                <Select value={form.categoryId} onValueChange={(value) => setForm((prev) => ({ ...prev, categoryId: value }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((category) => (
                      <SelectItem key={category.id} value={category.id}>
                        {category.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Produk</Label>
                <Select value={form.productId} onValueChange={(value) => setForm((prev) => ({ ...prev, productId: value }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {filteredProducts.map((product) => (
                      <SelectItem key={product.id} value={product.id}>
                        {product.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-2">
                <Label>Satuan</Label>
                <Select value={form.unitId} onValueChange={(value) => setForm((prev) => ({ ...prev, unitId: value }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {units.map((unit) => (
                      <SelectItem key={unit.id} value={unit.id}>
                        {unit.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Rangka</Label>
                <Select value={form.frameId} onValueChange={(value) => setForm((prev) => ({ ...prev, frameId: value }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {frames.map((frame) => (
                      <SelectItem key={frame.id} value={frame.id}>
                        {frame.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Bahan</Label>
                <Select
                  value={form.materialId ?? DISPLAY_MATERIAL_NONE}
                  onValueChange={(value) => setForm((prev) => ({ ...prev, materialId: value === DISPLAY_MATERIAL_NONE ? null : value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={DISPLAY_MATERIAL_NONE}>Tanpa Bahan</SelectItem>
                    {materials.map((material) => (
                      <SelectItem key={material.id} value={material.id}>
                        {material.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-2">
                <Label>Finishing</Label>
                <Select value={form.finishingId} onValueChange={(value) => setForm((prev) => ({ ...prev, finishingId: value }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {finishings.map((finishing) => (
                      <SelectItem key={finishing.id} value={finishing.id}>
                        {finishing.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Harga Jual</Label>
                <Input
                  type="number"
                  min={0}
                  value={form.sellingPrice}
                  onChange={(e) => setForm((prev) => ({ ...prev, sellingPrice: Number(e.target.value) }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Minimum Order</Label>
                <Input
                  type="number"
                  min={1}
                  value={form.minimumOrder}
                  onChange={(e) => setForm((prev) => ({ ...prev, minimumOrder: Number(e.target.value) }))}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Estimasi</Label>
              <Input
                value={form.estimateText ?? ""}
                onChange={(e) => setForm((prev) => ({ ...prev, estimateText: e.target.value }))}
                placeholder="Contoh: 2 hari"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Batal
            </Button>
            <Button onClick={handleSave} disabled={createDisplay.isPending || updateDisplay.isPending}>
              {editing ? "Simpan" : "Tambah"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Hapus Display</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Yakin ingin menghapus <strong className="text-foreground">{deleting?.name}</strong>?
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
              Batal
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleteDisplay.isPending}>
              Hapus
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}


