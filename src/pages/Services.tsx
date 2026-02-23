import { useMemo, useState } from "react";
import { Edit, Plus, Search, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCategories } from "@/hooks/useCategories";
import { useProducts } from "@/hooks/useProducts";
import { useCreateService, useDeleteService, useServices, useUpdateService, type ServicePayload } from "@/hooks/useServices";
import { useFinishings, useServiceMaterials, useUnits } from "@/hooks/useMasters";
import { formatCurrency } from "@/lib/format";
import type { ServiceCatalog } from "@/types";
import { toast } from "sonner";

const emptyForm: ServicePayload = {
  code: "",
  productId: "",
  categoryId: "",
  unitId: "",
  serviceMaterialId: "",
  finishingId: "",
  sellingPrice: 0,
  estimateText: "",
  isActive: true,
};

const compareByCodeAsc = <T extends { code?: string | null }>(a: T, b: T): number => {
  const codeA = (a.code ?? "").trim();
  const codeB = (b.code ?? "").trim();
  if (codeA && codeB) return codeA.localeCompare(codeB, "en", { numeric: true, sensitivity: "base" });
  if (codeA) return -1;
  if (codeB) return 1;
  return 0;
};

export default function ServicesPage() {
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editing, setEditing] = useState<ServiceCatalog | null>(null);
  const [deleting, setDeleting] = useState<ServiceCatalog | null>(null);
  const [form, setForm] = useState<ServicePayload>(emptyForm);

  const { data: services = [], isLoading } = useServices({ search });
  const { data: categories = [] } = useCategories({ activeOnly: true });
  const { data: products = [] } = useProducts({ activeOnly: true });
  const { data: units = [] } = useUnits({ activeOnly: true });
  const { data: serviceMaterials = [] } = useServiceMaterials({ activeOnly: true });
  const { data: finishings = [] } = useFinishings({ activeOnly: true });

  const createService = useCreateService();
  const updateService = useUpdateService();
  const deleteService = useDeleteService();

  const filteredProducts = useMemo(() => {
    if (!form.categoryId) return products;
    return products.filter((item) => item.categoryId === form.categoryId);
  }, [products, form.categoryId]);

  const sortedServices = useMemo(() => [...services].sort(compareByCodeAsc), [services]);

  const openCreate = () => {
    setEditing(null);
    setForm({
      ...emptyForm,
      categoryId: categories[0]?.id ?? "",
      productId: products[0]?.id ?? "",
      unitId: units[0]?.id ?? "",
      serviceMaterialId: serviceMaterials[0]?.id ?? "",
      finishingId: finishings[0]?.id ?? "",
    });
    setDialogOpen(true);
  };

  const openEdit = (service: ServiceCatalog) => {
    setEditing(service);
    setForm({
      code: service.code,
      productId: service.productId,
      categoryId: service.categoryId,
      unitId: service.unitId,
      serviceMaterialId: service.serviceMaterialId,
      finishingId: service.finishingId,
      sellingPrice: service.sellingPrice,
      estimateText: service.estimateText ?? "",
      isActive: service.isActive ?? true,
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.code.trim()) return toast.error("Kode jasa wajib diisi");
    if (!form.productId || !form.categoryId || !form.unitId || !form.serviceMaterialId || !form.finishingId) {
      return toast.error("Lengkapi semua relasi jasa");
    }

    try {
      if (editing) {
        await updateService.mutateAsync({ id: editing.id, ...form, estimateText: form.estimateText || null });
        toast.success("Jasa berhasil diperbarui");
      } else {
        await createService.mutateAsync({ ...form, estimateText: form.estimateText || null });
        toast.success("Jasa berhasil ditambahkan");
      }
      setDialogOpen(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Gagal menyimpan jasa");
    }
  };

  const handleDelete = async () => {
    if (!deleting) return;
    try {
      await deleteService.mutateAsync(deleting.id);
      toast.success("Jasa berhasil dihapus");
      setDeleteDialogOpen(false);
      setDeleting(null);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Gagal menghapus jasa");
    }
  };

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Cari jasa..." className="pl-9 bg-card" />
        </div>
        <Button onClick={openCreate} className="gap-2">
          <Plus className="w-4 h-4" /> Tambah Jasa
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
        {isLoading && <div className="text-sm text-muted-foreground">Memuat jasa...</div>}
        {!isLoading &&
          sortedServices.map((service) => (
            <div key={service.id} className="stat-card group">
              <div className="flex justify-between items-start mb-2">
                <div>
                  <h4 className="font-semibold text-foreground">{service.code}</h4>
                  <p className="text-xs text-muted-foreground">{service.product?.name ?? "-"}</p>
                </div>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => openEdit(service)}>
                    <Edit className="w-4 h-4" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8 text-destructive hover:text-destructive"
                    onClick={() => {
                      setDeleting(service);
                      setDeleteDialogOpen(true);
                    }}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
              <p className="text-sm text-muted-foreground">
                {service.serviceMaterial?.name} | {service.finishing?.name}
              </p>
              <p className="text-xs text-muted-foreground">{service.unit?.name}</p>
              <p className="text-sm font-semibold text-primary mt-2">{formatCurrency(service.sellingPrice)}</p>
              <p className="text-xs text-muted-foreground mt-1">{service.estimateText || "-"}</p>
            </div>
          ))}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Jasa" : "Tambah Jasa"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-2">
              <Label>Kode Jasa</Label>
              <Input value={form.code} onChange={(e) => setForm((prev) => ({ ...prev, code: e.target.value }))} />
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
                        {unit.code} - {unit.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Material</Label>
                <Select value={form.serviceMaterialId} onValueChange={(value) => setForm((prev) => ({ ...prev, serviceMaterialId: value }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {serviceMaterials.map((material) => (
                      <SelectItem key={material.id} value={material.id}>
                        {material.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
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
            </div>
            <div className="grid grid-cols-2 gap-3">
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
                <Label>Estimasi</Label>
                <Input
                  value={form.estimateText ?? ""}
                  onChange={(e) => setForm((prev) => ({ ...prev, estimateText: e.target.value }))}
                  placeholder="Contoh: 2 hari"
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Batal
            </Button>
            <Button onClick={handleSave} disabled={createService.isPending || updateService.isPending}>
              {editing ? "Simpan" : "Tambah"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Hapus Jasa</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Yakin ingin menghapus <strong className="text-foreground">{deleting?.code}</strong>?
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
              Batal
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleteService.isPending}>
              Hapus
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}


