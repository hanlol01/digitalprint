import { useMemo, useState } from "react";
import { Check, ChevronsUpDown, Edit, Plus, Search, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { cn } from "@/lib/utils";
import { useCategories } from "@/hooks/useCategories";
import { useCreateProduct, useDeleteProduct, useProducts, useUpdateProduct } from "@/hooks/useProducts";
import { useMaterials } from "@/hooks/useMaterials";
import { formatCurrency } from "@/lib/format";
import { type MaterialVariant, type PricingUnit, type Product } from "@/types";
import { toast } from "sonner";

const pricingLabel: Record<string, string> = {
  per_lembar: "Per Lembar",
  per_meter: "Per m²",
  per_cm: "Per cm²",
  per_pcs: "Per Pcs",
};

const pricingOptions: { value: PricingUnit; label: string }[] = [
  { value: "per_lembar", label: "Per Lembar" },
  { value: "per_meter", label: "Per m²" },
  { value: "per_cm", label: "Per cm²" },
  { value: "per_pcs", label: "Per Pcs" },
];

const emptyProduct: Omit<Product, "id"> = {
  name: "",
  categoryId: "",
  pricingUnit: "per_lembar",
  materialVariants: [],
  hasCustomSize: false,
  customWidth: null,
  customHeight: null,
  finishingCost: 0,
  estimatedMinutes: 5,
  isActive: true,
};

export default function Products() {
  const [search, setSearch] = useState("");
  const [selectedCat, setSelectedCat] = useState("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [deletingProduct, setDeletingProduct] = useState<Product | null>(null);
  const [form, setForm] = useState<Omit<Product, "id">>(emptyProduct);

  const [materialSearchOpen, setMaterialSearchOpen] = useState(false);
  const [newVariantMaterialId, setNewVariantMaterialId] = useState("");

  const { data: categories = [] } = useCategories({ activeOnly: true });
  const { data: materials = [] } = useMaterials();
  const { data: products = [], isLoading } = useProducts({
    search,
    categoryId: selectedCat === "all" ? undefined : selectedCat,
    activeOnly: false,
  });
  const createProduct = useCreateProduct();
  const updateProduct = useUpdateProduct();
  const deleteProduct = useDeleteProduct();

  const filtered = useMemo(() => {
    return products.filter((product) => {
      if (selectedCat !== "all" && product.categoryId !== selectedCat) return false;
      if (search && !product.name.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
  }, [products, selectedCat, search]);

  const selectedMaterialForVariant = materials.find((material) => material.id === newVariantMaterialId);

  const resetVariantInput = () => {
    setNewVariantMaterialId("");
  };

  const openCreate = () => {
    const defaultCategoryId = categories[0]?.id ?? "";
    setEditingProduct(null);
    setForm({ ...emptyProduct, categoryId: defaultCategoryId });
    resetVariantInput();
    setDialogOpen(true);
  };

  const openEdit = (product: Product) => {
    setEditingProduct(product);
    setForm({
      name: product.name,
      categoryId: product.categoryId,
      pricingUnit: product.pricingUnit,
      materialVariants: [...product.materialVariants],
      hasCustomSize: product.hasCustomSize,
      customWidth: product.customWidth ?? null,
      customHeight: product.customHeight ?? null,
      finishingCost: product.finishingCost,
      estimatedMinutes: product.estimatedMinutes,
      isActive: product.isActive ?? true,
    });
    resetVariantInput();
    setDialogOpen(true);
  };

  const addVariant = () => {
    if (!selectedMaterialForVariant) {
      toast.error("Pilih bahan dari stok terlebih dahulu");
      return;
    }

    const alreadyExists = form.materialVariants.some((variant) => variant.materialId === selectedMaterialForVariant.id);
    if (alreadyExists) {
      toast.error("Bahan ini sudah ada di daftar varian");
      return;
    }

    const variant: MaterialVariant = {
      id: crypto.randomUUID(),
      materialId: selectedMaterialForVariant.id,
      name: selectedMaterialForVariant.name,
      costPrice: selectedMaterialForVariant.costPrice ?? 0,
      sellingPrice: selectedMaterialForVariant.sellingPrice ?? 0,
      pricePerUnit: selectedMaterialForVariant.sellingPrice ?? 0,
      material: selectedMaterialForVariant,
      recipes: [],
    };

    setForm((prev) => ({ ...prev, materialVariants: [...prev.materialVariants, variant] }));
    resetVariantInput();
  };

  const removeVariant = (id: string) => {
    setForm((prev) => ({ ...prev, materialVariants: prev.materialVariants.filter((variant) => variant.id !== id) }));
  };

  const handleSave = async () => {
    if (!form.name.trim()) {
      toast.error("Nama produk wajib diisi");
      return;
    }
    if (!form.categoryId) {
      toast.error("Kategori wajib dipilih");
      return;
    }
    if (form.materialVariants.length === 0) {
      toast.error("Tambahkan minimal 1 varian bahan");
      return;
    }
    if (form.hasCustomSize && (!form.customWidth || !form.customHeight)) {
      toast.error("Panjang dan lebar custom wajib diisi");
      return;
    }

    const payload = {
      name: form.name,
      categoryId: form.categoryId,
      pricingUnit: form.pricingUnit,
      hasCustomSize: form.hasCustomSize,
      customWidth: form.hasCustomSize ? Number(form.customWidth) : undefined,
      customHeight: form.hasCustomSize ? Number(form.customHeight) : undefined,
      finishingCost: form.finishingCost,
      estimatedMinutes: form.estimatedMinutes,
      isActive: form.isActive ?? true,
      variants: form.materialVariants.map((variant) => ({
        materialId: variant.materialId,
        name: variant.name,
        recipes: (variant.recipes ?? []).map((recipe) => ({
          materialId: recipe.materialId,
          usagePerUnit: recipe.usagePerUnit,
        })),
      })),
    };

    try {
      if (editingProduct) {
        await updateProduct.mutateAsync({ id: editingProduct.id, ...payload });
        toast.success("Produk berhasil diperbarui");
      } else {
        await createProduct.mutateAsync(payload);
        toast.success("Produk berhasil ditambahkan");
      }
      setDialogOpen(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Gagal menyimpan produk");
    }
  };

  const handleDelete = async () => {
    if (!deletingProduct) return;
    try {
      await deleteProduct.mutateAsync(deletingProduct.id);
      toast.success("Produk berhasil dihapus");
      setDeleteDialogOpen(false);
      setDeletingProduct(null);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Gagal menghapus produk");
    }
  };

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Cari produk..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 bg-card" />
        </div>
        <Button onClick={openCreate} className="gap-2">
          <Plus className="w-4 h-4" /> Tambah Produk
        </Button>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1">
        <button
          onClick={() => setSelectedCat("all")}
          className={`px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap ${
            selectedCat === "all" ? "bg-primary text-primary-foreground" : "bg-card border border-border text-muted-foreground hover:bg-muted"
          }`}
        >
          Semua
        </button>
        {categories.map((category) => (
          <button
            key={category.id}
            onClick={() => setSelectedCat(category.id)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap ${
              selectedCat === category.id
                ? "bg-primary text-primary-foreground"
                : "bg-card border border-border text-muted-foreground hover:bg-muted"
            }`}
          >
            {category.icon} {category.name}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
        {isLoading && <div className="text-sm text-muted-foreground">Memuat data produk...</div>}
        {!isLoading &&
          filtered.map((product) => {
            const category = categories.find((item) => item.id === product.categoryId);
            return (
              <div key={product.id} className="stat-card group">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="text-2xl">{category?.icon}</div>
                    <div>
                      <h4 className="font-semibold text-foreground">{product.name}</h4>
                      <p className="text-xs text-muted-foreground">
                        {category?.name} • {pricingLabel[product.pricingUnit]}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(product)}>
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive hover:text-destructive"
                      onClick={() => {
                        setDeletingProduct(product);
                        setDeleteDialogOpen(true);
                      }}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
                {product.hasCustomSize && (
                  <span className="badge-status bg-info/10 text-info mb-2 inline-block">
                    Custom {product.customWidth ?? 0} x {product.customHeight ?? 0}
                  </span>
                )}
                <div className="space-y-1.5">
                  {product.materialVariants.map((variant) => (
                    <div key={variant.id} className="text-sm py-2 px-2 rounded bg-muted/30">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">{variant.name}</span>
                        <span className="font-medium text-foreground">{formatCurrency(variant.sellingPrice)}</span>
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">
                        Modal: {formatCurrency(variant.costPrice)}
                      </div>
                    </div>
                  ))}
                </div>
                {product.finishingCost > 0 && (
                  <p className="text-xs text-muted-foreground mt-2">Finishing: +{formatCurrency(product.finishingCost)}</p>
                )}
                <p className="text-xs text-muted-foreground mt-1">Estimasi: {product.estimatedMinutes} menit</p>
              </div>
            );
          })}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingProduct ? "Edit Produk" : "Tambah Produk Baru"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Nama Produk</Label>
              <Input value={form.name} onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))} />
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
                        {category.icon} {category.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Satuan Harga</Label>
                <Select
                  value={form.pricingUnit}
                  onValueChange={(value) => setForm((prev) => ({ ...prev, pricingUnit: value as PricingUnit }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {pricingOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Biaya Finishing (Rp)</Label>
                <Input
                  type="number"
                  value={form.finishingCost}
                  onChange={(e) => setForm((prev) => ({ ...prev, finishingCost: Number(e.target.value) }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Estimasi (menit)</Label>
                <Input
                  type="number"
                  value={form.estimatedMinutes}
                  onChange={(e) => setForm((prev) => ({ ...prev, estimatedMinutes: Number(e.target.value) }))}
                />
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <Switch
                  checked={form.hasCustomSize}
                  onCheckedChange={(value) =>
                    setForm((prev) => ({
                      ...prev,
                      hasCustomSize: value,
                      customWidth: value ? prev.customWidth ?? 1 : null,
                      customHeight: value ? prev.customHeight ?? 1 : null,
                    }))
                  }
                />
                <Label>Ukuran Custom (Panjang x Lebar)</Label>
              </div>
              {form.hasCustomSize && (
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label>Panjang Default</Label>
                    <Input
                      type="number"
                      min={0.1}
                      step={0.1}
                      value={form.customWidth ?? 1}
                      onChange={(e) => setForm((prev) => ({ ...prev, customWidth: Number(e.target.value) }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Lebar Default</Label>
                    <Input
                      type="number"
                      min={0.1}
                      step={0.1}
                      value={form.customHeight ?? 1}
                      onChange={(e) => setForm((prev) => ({ ...prev, customHeight: Number(e.target.value) }))}
                    />
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label>Varian Bahan</Label>
              <p className="text-xs text-muted-foreground">Harga modal dan harga jual mengikuti master bahan pada halaman Stok Bahan.</p>
              <div className="space-y-1.5">
                {form.materialVariants.map((variant) => (
                  <div key={variant.id} className="grid grid-cols-[1fr_140px_140px_32px] items-center gap-2 text-sm bg-muted/30 rounded px-2 py-2">
                    <span className="text-foreground">{variant.name}</span>
                    <span className="text-muted-foreground">Modal: {formatCurrency(variant.costPrice)}</span>
                    <span className="font-medium text-foreground">Jual: {formatCurrency(variant.sellingPrice)}</span>
                    <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive" onClick={() => removeVariant(variant.id)}>
                      <X className="w-3 h-3" />
                    </Button>
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-[1fr_110px] gap-2">
                <Popover open={materialSearchOpen} onOpenChange={setMaterialSearchOpen}>
                  <PopoverTrigger asChild>
                    <Button variant="outline" role="combobox" className="justify-between font-normal">
                      {selectedMaterialForVariant ? selectedMaterialForVariant.name : "Cari & pilih bahan..."}
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="p-0 w-[360px]">
                    <Command>
                      <CommandInput placeholder="Cari nama bahan..." />
                      <CommandList>
                        <CommandEmpty>Bahan tidak ditemukan.</CommandEmpty>
                        <CommandGroup>
                          {materials.map((material) => (
                            <CommandItem
                              key={material.id}
                              value={`${material.name} ${material.unit}`}
                              onSelect={() => {
                                setNewVariantMaterialId(material.id);
                                setMaterialSearchOpen(false);
                              }}
                            >
                              <Check
                                className={cn(
                                  "mr-2 h-4 w-4",
                                  newVariantMaterialId === material.id ? "opacity-100" : "opacity-0",
                                )}
                              />
                              <div className="flex-1">
                                <div>{material.name}</div>
                                <div className="text-xs text-muted-foreground">
                                  Stok: {material.currentStock} {material.unit}
                                </div>
                              </div>
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
                <Button variant="outline" onClick={addVariant} className="shrink-0">
                  Tambah
                </Button>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Batal
            </Button>
            <Button onClick={handleSave} disabled={createProduct.isPending || updateProduct.isPending}>
              {editingProduct ? "Simpan" : "Tambah"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Hapus Produk</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Yakin ingin menghapus <strong className="text-foreground">{deletingProduct?.name}</strong>?
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
              Batal
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleteProduct.isPending}>
              Hapus
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
