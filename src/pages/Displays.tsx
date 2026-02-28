import { useEffect, useMemo, useRef, useState } from "react";
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
import { useAuth } from "@/contexts/AuthContext";
import { formatCurrency } from "@/lib/format";
import { canMutateMasterData } from "@/lib/rbac";
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

const normalizeText = (value?: string | null): string => (value ?? "").trim().toLowerCase();

const compareByCodeAsc = <T extends { code?: string | null }>(a: T, b: T): number => {
  const codeA = (a.code ?? "").trim();
  const codeB = (b.code ?? "").trim();
  if (codeA && codeB) return codeA.localeCompare(codeB, "en", { numeric: true, sensitivity: "base" });
  if (codeA) return -1;
  if (codeB) return 1;
  return 0;
};

const compareByCodeThenName = <T extends { code?: string | null; name: string }>(a: T, b: T): number => {
  const byCode = compareByCodeAsc(a, b);
  if (byCode !== 0) return byCode;
  return a.name.localeCompare(b.name, "id", { sensitivity: "base" });
};

const parseCurrencyInput = (value: string): number => {
  const digits = value.replace(/\D/g, "");
  return digits ? Number(digits) : 0;
};

const formatCurrencyInput = (value: number): string => {
  if (!Number.isFinite(value) || value <= 0) return "";
  return `Rp ${Math.round(value).toLocaleString("id-ID")}`;
};

const generateNextDisplayCode = (displays: DisplayCatalog[]): string => {
  const maxIndex = displays.reduce((max, item) => {
    const match = (item.code ?? "").trim().toLowerCase().match(/^dsp-(\d+)$/);
    if (!match) return max;
    const parsed = Number(match[1]);
    return Number.isFinite(parsed) ? Math.max(max, parsed) : max;
  }, 0);
  return `dsp-${String(Math.max(maxIndex + 1, 1)).padStart(3, "0")}`;
};

export default function DisplaysPage() {
  const { user } = useAuth();
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editing, setEditing] = useState<DisplayCatalog | null>(null);
  const [deleting, setDeleting] = useState<DisplayCatalog | null>(null);
  const [form, setForm] = useState<DisplayPayload>(emptyForm);
  const nameInputRef = useRef<HTMLInputElement | null>(null);

  const { data: displays = [], isLoading } = useDisplays({ search });
  const { data: displayCodeSource = [] } = useDisplays();
  const { data: categories = [] } = useCategories({ activeOnly: true });
  const { data: products = [] } = useProducts({ activeOnly: true });
  const { data: units = [] } = useUnits({ activeOnly: true });
  const { data: frames = [] } = useFrames({ activeOnly: true });
  const { data: materials = [] } = useMaterials();
  const { data: finishings = [] } = useFinishings({ activeOnly: true });

  const createDisplay = useCreateDisplay();
  const updateDisplay = useUpdateDisplay();
  const deleteDisplay = useDeleteDisplay();
  const canMutate = canMutateMasterData(user?.role);

  const sortedDisplays = useMemo(() => [...displays].sort(compareByCodeAsc), [displays]);
  const sortedUnits = useMemo(() => [...units].sort(compareByCodeThenName), [units]);
  const sortedFrames = useMemo(() => [...frames].sort(compareByCodeThenName), [frames]);
  const sortedMaterials = useMemo(
    () => [...materials].sort((a, b) => compareByCodeThenName({ code: a.code, name: a.name }, { code: b.code, name: b.name })),
    [materials],
  );
  const sortedFinishings = useMemo(() => [...finishings].sort(compareByCodeThenName), [finishings]);
  const nextDisplayCode = useMemo(() => generateNextDisplayCode(displayCodeSource), [displayCodeSource]);

  const defaultDisplayCategory = useMemo(
    () => categories.find((item) => normalizeText(item.name).includes("display")) ?? categories[0] ?? null,
    [categories],
  );
  const defaultDisplayProduct = useMemo(() => {
    if (products.length === 0) return null;
    const displayExact = products.find((item) => normalizeText(item.name) === "display");
    const displayByName = products.filter((item) => normalizeText(item.name).includes("display"));
    if (defaultDisplayCategory) {
      return (
        (displayExact && displayExact.categoryId === defaultDisplayCategory.id ? displayExact : null) ??
        displayByName.find((item) => item.categoryId === defaultDisplayCategory.id) ??
        displayExact ??
        products.find((item) => item.categoryId === defaultDisplayCategory.id) ??
        displayByName[0] ??
        null
      );
    }
    return displayExact ?? displayByName[0] ?? products[0] ?? null;
  }, [products, defaultDisplayCategory]);
  const defaultSetUnit = useMemo(
    () =>
      units.find((item) => normalizeText(item.name) === "set" || normalizeText(item.code) === "set") ??
      units.find((item) => normalizeText(item.name).includes("set")) ??
      units[0] ??
      null,
    [units],
  );

  const selectedCategory = categories.find((item) => item.id === form.categoryId) ?? null;
  const selectedProduct = products.find((item) => item.id === form.productId) ?? null;

  useEffect(() => {
    if (!dialogOpen || editing) return;
    setForm((prev) => ({
      ...prev,
      code: prev.code || nextDisplayCode,
      categoryId: prev.categoryId || defaultDisplayCategory?.id || "",
      productId: prev.productId || defaultDisplayProduct?.id || "",
      unitId: prev.unitId || defaultSetUnit?.id || "",
    }));
  }, [dialogOpen, editing, nextDisplayCode, defaultDisplayCategory, defaultDisplayProduct, defaultSetUnit]);

  const openCreate = () => {
    if (!canMutate) {
      toast.error("Role management hanya bisa melihat data");
      return;
    }
    setEditing(null);
    setForm({
      ...emptyForm,
      code: nextDisplayCode,
      categoryId: defaultDisplayCategory?.id ?? "",
      productId: defaultDisplayProduct?.id ?? "",
      unitId: defaultSetUnit?.id ?? "",
      frameId: "",
      materialId: null,
      finishingId: "",
    });
    setDialogOpen(true);
  };

  const openEdit = (display: DisplayCatalog) => {
    if (!canMutate) {
      toast.error("Role management hanya bisa melihat data");
      return;
    }
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
    if (!canMutate) {
      toast.error("Role management hanya bisa melihat data");
      return;
    }
    const resolvedCode = form.code.trim() || nextDisplayCode;
    if (!resolvedCode.trim()) return toast.error("Kode display wajib diisi");
    if (!form.name.trim()) return toast.error("Nama display wajib diisi");
    if (!form.productId || !form.categoryId || !form.unitId) return toast.error("Kategori/produk/satuan wajib valid");
    if (!form.frameId || !form.materialId || !form.finishingId) return toast.error("Pilih rangka, bahan, dan finishing terlebih dahulu");
    if (!Number.isFinite(form.sellingPrice) || form.sellingPrice < 0) return toast.error("Harga jual tidak valid");
    if (!Number.isFinite(form.minimumOrder) || form.minimumOrder < 1) return toast.error("Minimum order tidak valid");

    const payload: DisplayPayload = {
      ...form,
      code: resolvedCode,
      sellingPrice: Math.max(Math.round(form.sellingPrice) || 0, 0),
      minimumOrder: Math.max(Math.round(form.minimumOrder) || 1, 1),
    };

    try {
      if (editing) {
        await updateDisplay.mutateAsync({ id: editing.id, ...payload, estimateText: payload.estimateText || null });
        toast.success("Display berhasil diperbarui");
      } else {
        await createDisplay.mutateAsync({ ...payload, estimateText: payload.estimateText || null });
        toast.success("Display berhasil ditambahkan");
      }
      setDialogOpen(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Gagal menyimpan display");
    }
  };

  const handleDelete = async () => {
    if (!canMutate) {
      toast.error("Role management hanya bisa melihat data");
      return;
    }
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
      {!canMutate ? (
        <div className="rounded-lg border border-warning/40 bg-warning/10 px-3 py-2 text-xs text-warning">
          Mode baca: role management tidak dapat menambah, mengubah, atau menghapus display.
        </div>
      ) : null}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Cari display..." className="pl-9 bg-card" />
        </div>
        {canMutate ? (
          <Button onClick={openCreate} className="gap-2">
            <Plus className="w-4 h-4" /> Tambah Display
          </Button>
        ) : null}
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
                {canMutate ? (
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
                ) : null}
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
        <DialogContent
          className="max-w-2xl"
          onOpenAutoFocus={(event) => {
            event.preventDefault();
            nameInputRef.current?.focus();
          }}
        >
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Display" : "Tambah Display"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Kode Display</Label>
                <Input value={form.code || nextDisplayCode} readOnly className="bg-muted text-muted-foreground" />
              </div>
              <div className="space-y-2">
                <Label>Nama Display</Label>
                <Input ref={nameInputRef} value={form.name} onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Kategori</Label>
                <Input value={selectedCategory?.name ?? ""} readOnly className="bg-muted text-muted-foreground" />
              </div>
              <div className="space-y-2">
                <Label>Produk</Label>
                <Input value={selectedProduct?.name ?? ""} readOnly className="bg-muted text-muted-foreground" />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-2">
                <Label>Satuan</Label>
                <Select value={form.unitId} onValueChange={(value) => setForm((prev) => ({ ...prev, unitId: value }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="max-h-72">
                    {sortedUnits.map((unit) => (
                      <SelectItem key={unit.id} value={unit.id}>
                        {unit.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Rangka</Label>
                <Select
                  value={form.frameId || undefined}
                  onValueChange={(value) => setForm((prev) => ({ ...prev, frameId: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih rangka" />
                  </SelectTrigger>
                  <SelectContent
                    className="max-h-72"
                    position="popper"
                    side="bottom"
                    sideOffset={6}
                    align="start"
                    avoidCollisions={false}
                  >
                    {sortedFrames.map((frame) => (
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
                  value={form.materialId ?? undefined}
                  onValueChange={(value) => setForm((prev) => ({ ...prev, materialId: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih bahan" />
                  </SelectTrigger>
                  <SelectContent
                    className="max-h-72"
                    position="popper"
                    side="bottom"
                    sideOffset={6}
                    align="start"
                    avoidCollisions={false}
                  >
                    {sortedMaterials.map((material) => (
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
                <Select
                  value={form.finishingId || undefined}
                  onValueChange={(value) => setForm((prev) => ({ ...prev, finishingId: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih finishing" />
                  </SelectTrigger>
                  <SelectContent
                    className="max-h-72"
                    position="popper"
                    side="bottom"
                    sideOffset={6}
                    align="start"
                    avoidCollisions={false}
                  >
                    {sortedFinishings.map((finishing) => (
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
                  type="text"
                  inputMode="numeric"
                  value={formatCurrencyInput(form.sellingPrice)}
                  onChange={(e) => setForm((prev) => ({ ...prev, sellingPrice: parseCurrencyInput(e.target.value) }))}
                  placeholder="Rp 0"
                />
              </div>
              <div className="space-y-2">
                <Label>Minimum Order</Label>
                <Input
                  type="number"
                  min={1}
                  value={form.minimumOrder}
                  onChange={(e) => setForm((prev) => ({ ...prev, minimumOrder: Math.max(Number(e.target.value) || 1, 1) }))}
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
            <Button onClick={handleSave} disabled={!canMutate || createDisplay.isPending || updateDisplay.isPending}>
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
            <Button variant="destructive" onClick={handleDelete} disabled={!canMutate || deleteDisplay.isPending}>
              Hapus
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
