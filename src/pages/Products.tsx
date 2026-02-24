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
import { useFinishings, useUnits } from "@/hooks/useMasters";
import { formatCurrency } from "@/lib/format";
import { type MaterialVariant, type PricingUnit, type Product } from "@/types";
import { toast } from "sonner";

const pricingLabel: Record<string, string> = {
  per_lembar: "Per Lembar",
  per_meter: "Per m2",
  per_cm: "Per cm2",
  per_pcs: "Per Pcs",
};

const pricingOptions: { value: PricingUnit; label: string }[] = [
  { value: "per_lembar", label: "Per Lembar" },
  { value: "per_meter", label: "Per m2" },
  { value: "per_cm", label: "Per cm2" },
  { value: "per_pcs", label: "Per Pcs" },
];

const sanitizeCategoryIcon = (icon?: string | null): string | null => {
  const value = icon?.trim();
  if (!value) return null;
  return value.toLowerCase() === "box" ? null : value;
};

const buildVariantName = (materialName: string, finishingName?: string | null): string => {
  const name = materialName.trim();
  if (!finishingName?.trim()) return name;
  return `${name} - ${finishingName.trim()}`;
};

const getVariantMaterialName = (variant: MaterialVariant): string => {
  if (variant.material?.name?.trim()) return variant.material.name.trim();
  const [first] = variant.name.split(" - ");
  return first?.trim() || variant.name.trim();
};

const slugCodePart = (value?: string | null, fallback = "x"): string => {
  const normalized = (value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return normalized || fallback;
};

const buildVariantCodeSeed = (productCode?: string | null, materialCode?: string | null, finishingCode?: string | null): string => {
  return [
    slugCodePart(productCode, "prd"),
    slugCodePart(materialCode, "mat"),
    finishingCode ? slugCodePart(finishingCode, "fin") : "base",
  ].join("-");
};

const ensureUniqueVariantCode = (seed: string, existingVariants: MaterialVariant[], ignoreVariantId?: string): string => {
  const usedCodes = new Set(
    existingVariants
      .filter((variant) => variant.id !== ignoreVariantId)
      .map((variant) => (variant.code ?? "").trim().toLowerCase())
      .filter(Boolean),
  );
  const base = slugCodePart(seed, "var");
  if (!usedCodes.has(base)) return base;
  let idx = 2;
  while (usedCodes.has(`${base}-${idx}`)) idx += 1;
  return `${base}-${idx}`;
};

const compareByCodeAsc = <T extends { code?: string | null; name?: string }>(a: T, b: T): number => {
  const codeA = (a.code ?? "").trim();
  const codeB = (b.code ?? "").trim();

  if (codeA && codeB) {
    return codeA.localeCompare(codeB, "en", { numeric: true, sensitivity: "base" });
  }
  if (codeA) return -1;
  if (codeB) return 1;

  return (a.name ?? "").localeCompare(b.name ?? "", "id", { sensitivity: "base" });
};

const emptyProduct: Omit<Product, "id"> = {
  code: "",
  legacyNumber: null,
  name: "",
  categoryId: "",
  unitId: null,
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
  const [newFinishingMaterialId, setNewFinishingMaterialId] = useState("");
  const [newVariantFinishingId, setNewVariantFinishingId] = useState("");

  const { data: categories = [] } = useCategories({ activeOnly: true });
  const { data: materials = [] } = useMaterials();
  const { data: units = [] } = useUnits({ activeOnly: true });
  const { data: finishings = [] } = useFinishings({ activeOnly: true });
  const { data: products = [], isLoading } = useProducts({
    search,
    categoryId: selectedCat === "all" ? undefined : selectedCat,
    activeOnly: false,
  });
  const createProduct = useCreateProduct();
  const updateProduct = useUpdateProduct();
  const deleteProduct = useDeleteProduct();

  const filtered = useMemo(() => {
    const result = products.filter((product) => {
      if (selectedCat !== "all" && product.categoryId !== selectedCat) return false;
      if (search) {
        const keyword = search.toLowerCase();
        const byName = product.name.toLowerCase().includes(keyword);
        const byCode = (product.code ?? "").toLowerCase().includes(keyword);
        if (!byName && !byCode) return false;
      }
      return true;
    });
    return [...result].sort(compareByCodeAsc);
  }, [products, selectedCat, search]);

  const selectedMaterialForVariant = materials.find((material) => material.id === newVariantMaterialId);
  const selectedFinishingForVariant = finishings.find((finishing) => finishing.id === newVariantFinishingId);

  const variantMaterialOptions = useMemo(() => {
    const map = new Map<string, string>();
    form.materialVariants.forEach((variant) => {
      const label = getVariantMaterialName(variant);
      if (!map.has(variant.materialId)) map.set(variant.materialId, label);
    });
    return [...map.entries()]
      .map(([id, label]) => ({ id, label }))
      .sort((a, b) => a.label.localeCompare(b.label, "id", { sensitivity: "base" }));
  }, [form.materialVariants]);

  const resetVariantInput = () => {
    setNewVariantMaterialId("");
    setNewFinishingMaterialId("");
    setNewVariantFinishingId("");
  };

  const openCreate = () => {
    const defaultCategoryId = categories[0]?.id ?? "";
    const defaultUnitId = units[0]?.id ?? null;
    setEditingProduct(null);
    setForm({ ...emptyProduct, categoryId: defaultCategoryId, unitId: defaultUnitId });
    resetVariantInput();
    setDialogOpen(true);
  };

  const openEdit = (product: Product) => {
    setEditingProduct(product);
    setForm({
      code: product.code ?? "",
      legacyNumber: product.legacyNumber ?? null,
      name: product.name,
      categoryId: product.categoryId,
      unitId: product.unitId ?? null,
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
    setNewFinishingMaterialId(product.materialVariants[0]?.materialId ?? "");
    setDialogOpen(true);
  };

  const addVariant = () => {
    if (!selectedMaterialForVariant) {
      toast.error("Pilih bahan dari stok terlebih dahulu");
      return;
    }

    const alreadyExists = form.materialVariants.some(
      (variant) => variant.materialId === selectedMaterialForVariant.id && !variant.finishingId,
    );
    if (alreadyExists) {
      toast.error("Varian bahan dasar ini sudah ada");
      return;
    }

    const generatedCode = ensureUniqueVariantCode(
      buildVariantCodeSeed(form.code, selectedMaterialForVariant.code ?? selectedMaterialForVariant.name, null),
      form.materialVariants,
    );

    const variant: MaterialVariant = {
      id: crypto.randomUUID(),
      code: generatedCode,
      materialId: selectedMaterialForVariant.id,
      unitId: form.unitId ?? undefined,
      finishingId: undefined,
      name: buildVariantName(selectedMaterialForVariant.name),
      costPrice: selectedMaterialForVariant.costPrice ?? 0,
      sellingPrice: selectedMaterialForVariant.sellingPrice ?? 0,
      pricePerUnit: selectedMaterialForVariant.sellingPrice ?? 0,
      minimumOrder: 1,
      estimateText: null,
      material: selectedMaterialForVariant,
      recipes: [],
    };

    setForm((prev) => ({ ...prev, materialVariants: [...prev.materialVariants, variant] }));
    setNewVariantMaterialId("");
    setNewFinishingMaterialId(selectedMaterialForVariant.id);
    setNewVariantFinishingId("");
  };

  const addVariantFinishing = () => {
    if (!newFinishingMaterialId) {
      toast.error("Pilih bahan untuk finishing");
      return;
    }
    if (!selectedFinishingForVariant) {
      toast.error("Pilih finishing terlebih dahulu");
      return;
    }

    const duplicate = form.materialVariants.some(
      (variant) =>
        variant.materialId === newFinishingMaterialId &&
        (variant.finishingId ?? null) === selectedFinishingForVariant.id,
    );
    if (duplicate) {
      toast.error("Varian finishing ini sudah ada pada bahan yang dipilih");
      return;
    }

    const baseVariant =
      form.materialVariants.find((variant) => variant.materialId === newFinishingMaterialId && !variant.finishingId) ??
      form.materialVariants.find((variant) => variant.materialId === newFinishingMaterialId);
    if (!baseVariant) {
      toast.error("Bahan belum tersedia pada daftar varian");
      return;
    }

    const materialName = getVariantMaterialName(baseVariant);
    const materialCodeRef =
      baseVariant.material?.code ??
      materials.find((material) => material.id === newFinishingMaterialId)?.code ??
      materialName;
    const generatedCode = ensureUniqueVariantCode(
      buildVariantCodeSeed(
        form.code,
        materialCodeRef,
        selectedFinishingForVariant.code ?? selectedFinishingForVariant.name,
      ),
      form.materialVariants,
    );
    const newVariant: MaterialVariant = {
      ...baseVariant,
      id: crypto.randomUUID(),
      code: generatedCode,
      finishingId: selectedFinishingForVariant.id,
      finishing: selectedFinishingForVariant,
      name: buildVariantName(materialName, selectedFinishingForVariant.name),
      recipes: (baseVariant.recipes ?? []).map((recipe) => ({
        ...recipe,
        id: crypto.randomUUID(),
        variantId: "",
      })),
    };

    setForm((prev) => ({ ...prev, materialVariants: [...prev.materialVariants, newVariant] }));
    setNewVariantFinishingId("");
  };

  const removeVariant = (id: string) => {
    setForm((prev) => ({ ...prev, materialVariants: prev.materialVariants.filter((variant) => variant.id !== id) }));
  };

  const updateVariant = (id: string, updater: (variant: MaterialVariant) => MaterialVariant) => {
    setForm((prev) => ({
      ...prev,
      materialVariants: prev.materialVariants.map((variant) => (variant.id === id ? updater(variant) : variant)),
    }));
  };

  const handleSave = async () => {
    if (!form.code?.trim()) {
      toast.error("Kode produk wajib diisi");
      return;
    }
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
    if (form.materialVariants.some((variant) => !variant.code?.trim())) {
      toast.error("Kode varian wajib diisi untuk semua varian");
      return;
    }
    if (form.materialVariants.some((variant) => !Number.isFinite(variant.sellingPrice) || variant.sellingPrice < 0)) {
      toast.error("Harga jual varian tidak valid");
      return;
    }
    const variantKeySet = new Set<string>();
    for (const variant of form.materialVariants) {
      const key = `${variant.materialId}:${variant.finishingId ?? "none"}`;
      if (variantKeySet.has(key)) {
        toast.error("Terdapat kombinasi bahan + finishing yang duplikat");
        return;
      }
      variantKeySet.add(key);
    }

    const payload = {
      code: form.code.trim(),
      legacyNumber: form.legacyNumber ?? undefined,
      name: form.name,
      categoryId: form.categoryId,
      unitId: form.unitId ?? undefined,
      pricingUnit: form.pricingUnit,
      hasCustomSize: form.hasCustomSize,
      customWidth: form.hasCustomSize ? Number(form.customWidth) : undefined,
      customHeight: form.hasCustomSize ? Number(form.customHeight) : undefined,
      finishingCost: form.finishingCost,
      estimatedMinutes: form.estimatedMinutes,
      isActive: form.isActive ?? true,
      variants: form.materialVariants.map((variant) => ({
        code: variant.code?.trim(),
        materialId: variant.materialId,
        unitId: variant.unitId ?? undefined,
        finishingId: variant.finishingId ?? undefined,
        name: variant.name,
        sellingPrice: Math.max(Number(variant.sellingPrice) || 0, 0),
        minimumOrder: variant.minimumOrder ?? 1,
        estimateText: variant.estimateText ?? null,
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
        {categories.map((category) => {
          const categoryIcon = sanitizeCategoryIcon(category.icon);
          return (
            <button
              key={category.id}
              onClick={() => setSelectedCat(category.id)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap ${
                selectedCat === category.id
                  ? "bg-primary text-primary-foreground"
                  : "bg-card border border-border text-muted-foreground hover:bg-muted"
              }`}
            >
              {categoryIcon ? `${categoryIcon} ` : ""}
              {category.name}
            </button>
          );
        })}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
        {isLoading && <div className="text-sm text-muted-foreground">Memuat data produk...</div>}
        {!isLoading &&
          filtered.map((product) => {
            const category = categories.find((item) => item.id === product.categoryId);
            const categoryIcon = sanitizeCategoryIcon(category?.icon);
            return (
              <div key={product.id} className="stat-card group">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    {categoryIcon ? <div className="text-2xl">{categoryIcon}</div> : null}
                    <div>
                      <h4 className="font-semibold text-foreground">{product.name}</h4>
                      <p className="text-xs text-muted-foreground">
                        {product.code || "-"} | {category?.name} | {pricingLabel[product.pricingUnit]}
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
                <p className="text-xs text-muted-foreground mt-1">Satuan: {product.unit?.name || "-"}</p>
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
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="space-y-2">
                <Label>Kode Produk</Label>
                <Input value={form.code ?? ""} onChange={(e) => setForm((prev) => ({ ...prev, code: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>ID Produk (Legacy)</Label>
                <Input
                  type="number"
                  min={1}
                  value={form.legacyNumber ?? ""}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      legacyNumber: e.target.value ? Number(e.target.value) : null,
                    }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Nama Produk</Label>
                <Input value={form.name} onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))} />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="space-y-2">
                <Label>Kategori</Label>
                <Select value={form.categoryId} onValueChange={(value) => setForm((prev) => ({ ...prev, categoryId: value }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((category) => {
                      const categoryIcon = sanitizeCategoryIcon(category.icon);
                      return (
                        <SelectItem key={category.id} value={category.id}>
                          {categoryIcon ? `${categoryIcon} ` : ""}
                          {category.name}
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Satuan</Label>
                <Select
                  value={form.unitId ?? "none"}
                  onValueChange={(value) =>
                    setForm((prev) => ({
                      ...prev,
                      unitId: value === "none" ? null : value,
                    }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">-</SelectItem>
                    {units.map((unit) => (
                      <SelectItem key={unit.id} value={unit.id}>
                        {unit.code} - {unit.name}
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

            <div className="space-y-3">
              <Label>Varian Produk</Label>
              <p className="text-xs text-muted-foreground">
                Tambahkan bahan dasar terlebih dahulu, lalu gunakan opsi tambah finishing untuk membuat kombinasi varian.
              </p>
              <div className="space-y-1.5">
                {form.materialVariants.map((variant) => (
                  <div key={variant.id} className="space-y-3 text-sm bg-muted/30 rounded px-3 py-3">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="text-foreground font-medium">{getVariantMaterialName(variant)}</p>
                        <p className="text-xs text-muted-foreground">
                          Finishing: {variant.finishing?.name ?? "-"}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Modal: {formatCurrency(variant.costPrice)} | Jual: {formatCurrency(variant.sellingPrice)}
                        </p>
                      </div>
                      <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive" onClick={() => removeVariant(variant.id)}>
                        <X className="w-3 h-3" />
                      </Button>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
                      <div className="space-y-1">
                        <Label className="text-xs">Kode Varian</Label>
                        <Input
                          value={variant.code ?? ""}
                          onChange={(e) => updateVariant(variant.id, (current) => ({ ...current, code: e.target.value }))}
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Satuan Varian</Label>
                        <Select
                          value={variant.unitId ?? "default"}
                          onValueChange={(value) =>
                            updateVariant(variant.id, (current) => ({
                              ...current,
                              unitId: value === "default" ? form.unitId ?? null : value,
                            }))
                          }
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="default">Ikuti Produk</SelectItem>
                            {units.map((unit) => (
                              <SelectItem key={unit.id} value={unit.id}>
                                {unit.code}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Finishing</Label>
                        <Select
                          value={variant.finishingId ?? "none"}
                          onValueChange={(value) =>
                            updateVariant(variant.id, (current) => {
                              const selectedFinishing = value === "none" ? null : finishings.find((item) => item.id === value) ?? null;
                              const nextCode = ensureUniqueVariantCode(
                                buildVariantCodeSeed(
                                  form.code,
                                  current.material?.code ?? getVariantMaterialName(current),
                                  selectedFinishing?.code ?? selectedFinishing?.name ?? null,
                                ),
                                form.materialVariants,
                                current.id,
                              );
                              return {
                                ...current,
                                code: nextCode,
                                finishingId: selectedFinishing?.id ?? null,
                                finishing: selectedFinishing,
                                name: buildVariantName(getVariantMaterialName(current), selectedFinishing?.name),
                              };
                            })
                          }
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">-</SelectItem>
                            {finishings.map((finishing) => (
                              <SelectItem key={finishing.id} value={finishing.id}>
                                {finishing.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                          </Select>
                        </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Harga Jual</Label>
                        <Input
                          type="number"
                          min={0}
                          value={variant.sellingPrice}
                          onChange={(e) =>
                            updateVariant(variant.id, (current) => ({
                              ...current,
                              sellingPrice: Math.max(Number(e.target.value) || 0, 0),
                            }))
                          }
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Min Order</Label>
                        <Input
                          type="number"
                          min={1}
                          value={variant.minimumOrder ?? 1}
                          onChange={(e) =>
                            updateVariant(variant.id, (current) => ({
                              ...current,
                              minimumOrder: Math.max(Number(e.target.value) || 1, 1),
                            }))
                          }
                        />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <Label className="text-xs">Estimasi Varian</Label>
                      <Input
                        value={variant.estimateText ?? ""}
                        onChange={(e) => updateVariant(variant.id, (current) => ({ ...current, estimateText: e.target.value }))}
                        placeholder="Contoh: 2 hari"
                      />
                    </div>
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-[1fr_130px] gap-2">
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
                  Tambah Bahan
                </Button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-[1fr_1fr_140px] gap-2">
                <Select value={newFinishingMaterialId} onValueChange={setNewFinishingMaterialId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih bahan varian..." />
                  </SelectTrigger>
                  <SelectContent>
                    {variantMaterialOptions.map((option) => (
                      <SelectItem key={option.id} value={option.id}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={newVariantFinishingId} onValueChange={setNewVariantFinishingId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih finishing..." />
                  </SelectTrigger>
                  <SelectContent>
                    {finishings.map((finishing) => (
                      <SelectItem key={finishing.id} value={finishing.id}>
                        {finishing.code} - {finishing.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button variant="outline" onClick={addVariantFinishing} className="shrink-0">
                  Tambah Finishing
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

