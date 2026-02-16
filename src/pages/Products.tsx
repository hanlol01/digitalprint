import { useState } from 'react';
import { products as initialProducts, categories, formatCurrency } from '@/data/mockData';
import { Search, Plus, Edit, Trash2, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import type { Product, MaterialVariant, PricingUnit } from '@/types';

const pricingLabel: Record<string, string> = { per_lembar: 'Per Lembar', per_meter: 'Per m²', per_cm: 'Per cm²', per_pcs: 'Per Pcs' };
const pricingOptions: { value: PricingUnit; label: string }[] = [
  { value: 'per_lembar', label: 'Per Lembar' },
  { value: 'per_meter', label: 'Per m²' },
  { value: 'per_cm', label: 'Per cm²' },
  { value: 'per_pcs', label: 'Per Pcs' },
];

const emptyProduct: Omit<Product, 'id'> = {
  name: '', categoryId: 'print', pricingUnit: 'per_lembar', basePrice: 0,
  materialVariants: [], hasCustomSize: false, finishingCost: 0, estimatedMinutes: 5,
};

export default function Products() {
  const [search, setSearch] = useState('');
  const [selectedCat, setSelectedCat] = useState('all');
  const [productList, setProductList] = useState<Product[]>(initialProducts);

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [deletingProduct, setDeletingProduct] = useState<Product | null>(null);

  // Form state
  const [form, setForm] = useState<Omit<Product, 'id'>>(emptyProduct);
  const [newVariantName, setNewVariantName] = useState('');
  const [newVariantPrice, setNewVariantPrice] = useState('');

  const filtered = productList.filter(p => {
    if (selectedCat !== 'all' && p.categoryId !== selectedCat) return false;
    if (search && !p.name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const openCreate = () => {
    setEditingProduct(null);
    setForm({ ...emptyProduct });
    setNewVariantName('');
    setNewVariantPrice('');
    setDialogOpen(true);
  };

  const openEdit = (product: Product) => {
    setEditingProduct(product);
    setForm({
      name: product.name,
      categoryId: product.categoryId,
      pricingUnit: product.pricingUnit,
      basePrice: product.basePrice,
      materialVariants: [...product.materialVariants],
      hasCustomSize: product.hasCustomSize,
      finishingCost: product.finishingCost,
      estimatedMinutes: product.estimatedMinutes,
    });
    setNewVariantName('');
    setNewVariantPrice('');
    setDialogOpen(true);
  };

  const openDelete = (product: Product) => {
    setDeletingProduct(product);
    setDeleteDialogOpen(true);
  };

  const addVariant = () => {
    if (!newVariantName.trim() || !newVariantPrice) return;
    const variant: MaterialVariant = {
      id: `mv_${Date.now()}`,
      name: newVariantName.trim(),
      pricePerUnit: Number(newVariantPrice),
    };
    setForm(f => ({ ...f, materialVariants: [...f.materialVariants, variant] }));
    setNewVariantName('');
    setNewVariantPrice('');
  };

  const removeVariant = (id: string) => {
    setForm(f => ({ ...f, materialVariants: f.materialVariants.filter(v => v.id !== id) }));
  };

  const handleSave = () => {
    if (!form.name.trim()) {
      toast.error('Nama produk wajib diisi');
      return;
    }
    if (form.materialVariants.length === 0) {
      toast.error('Tambahkan minimal 1 varian bahan');
      return;
    }

    if (editingProduct) {
      setProductList(list => list.map(p => p.id === editingProduct.id ? { ...p, ...form } : p));
      toast.success('Produk berhasil diperbarui');
    } else {
      const newProduct: Product = { id: `p_${Date.now()}`, ...form };
      setProductList(list => [...list, newProduct]);
      toast.success('Produk berhasil ditambahkan');
    }
    setDialogOpen(false);
  };

  const handleDelete = () => {
    if (!deletingProduct) return;
    setProductList(list => list.filter(p => p.id !== deletingProduct.id));
    toast.success('Produk berhasil dihapus');
    setDeleteDialogOpen(false);
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
        <button onClick={() => setSelectedCat('all')} className={`px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap ${selectedCat === 'all' ? 'bg-primary text-primary-foreground' : 'bg-card border border-border text-muted-foreground hover:bg-muted'}`}>
          Semua
        </button>
        {categories.map(c => (
          <button key={c.id} onClick={() => setSelectedCat(c.id)} className={`px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap ${selectedCat === c.id ? 'bg-primary text-primary-foreground' : 'bg-card border border-border text-muted-foreground hover:bg-muted'}`}>
            {c.icon} {c.name}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
        {filtered.map(product => {
          const cat = categories.find(c => c.id === product.categoryId);
          return (
            <div key={product.id} className="stat-card group">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="text-2xl">{cat?.icon}</div>
                  <div>
                    <h4 className="font-semibold text-foreground">{product.name}</h4>
                    <p className="text-xs text-muted-foreground">{cat?.name} • {pricingLabel[product.pricingUnit]}</p>
                  </div>
                </div>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(product)}>
                    <Edit className="w-4 h-4" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => openDelete(product)}>
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
              {product.hasCustomSize && <span className="badge-status bg-info/10 text-info mb-2 inline-block">Custom Size</span>}
              <div className="space-y-1.5">
                {product.materialVariants.map(m => (
                  <div key={m.id} className="flex justify-between text-sm py-1 px-2 rounded bg-muted/30">
                    <span className="text-muted-foreground">{m.name}</span>
                    <span className="font-medium text-foreground">{formatCurrency(m.pricePerUnit)}</span>
                  </div>
                ))}
              </div>
              {product.finishingCost > 0 && (
                <p className="text-xs text-muted-foreground mt-2">Finishing: +{formatCurrency(product.finishingCost)}</p>
              )}
              <p className="text-xs text-muted-foreground mt-1">⏱ Estimasi: {product.estimatedMinutes} menit</p>
            </div>
          );
        })}
      </div>

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingProduct ? 'Edit Produk' : 'Tambah Produk Baru'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Nama Produk</Label>
              <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Contoh: Banner Indoor" />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Kategori</Label>
                <Select value={form.categoryId} onValueChange={v => setForm(f => ({ ...f, categoryId: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {categories.map(c => (
                      <SelectItem key={c.id} value={c.id}>{c.icon} {c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Satuan Harga</Label>
                <Select value={form.pricingUnit} onValueChange={v => setForm(f => ({ ...f, pricingUnit: v as PricingUnit }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {pricingOptions.map(o => (
                      <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Biaya Finishing (Rp)</Label>
                <Input type="number" value={form.finishingCost} onChange={e => setForm(f => ({ ...f, finishingCost: Number(e.target.value) }))} />
              </div>
              <div className="space-y-2">
                <Label>Estimasi (menit)</Label>
                <Input type="number" value={form.estimatedMinutes} onChange={e => setForm(f => ({ ...f, estimatedMinutes: Number(e.target.value) }))} />
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Switch checked={form.hasCustomSize} onCheckedChange={v => setForm(f => ({ ...f, hasCustomSize: v }))} />
              <Label>Ukuran Custom (Panjang x Lebar)</Label>
            </div>

            {/* Material Variants */}
            <div className="space-y-2">
              <Label>Varian Bahan & Harga</Label>
              <div className="space-y-1.5">
                {form.materialVariants.map(v => (
                  <div key={v.id} className="flex items-center gap-2 text-sm bg-muted/30 rounded px-2 py-1.5">
                    <span className="flex-1 text-foreground">{v.name}</span>
                    <span className="font-medium text-foreground">{formatCurrency(v.pricePerUnit)}</span>
                    <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive" onClick={() => removeVariant(v.id)}>
                      <X className="w-3 h-3" />
                    </Button>
                  </div>
                ))}
              </div>
              <div className="flex gap-2">
                <Input placeholder="Nama bahan" value={newVariantName} onChange={e => setNewVariantName(e.target.value)} className="flex-1" />
                <Input placeholder="Harga" type="number" value={newVariantPrice} onChange={e => setNewVariantPrice(e.target.value)} className="w-28" />
                <Button variant="outline" size="sm" onClick={addVariant} className="shrink-0">Tambah</Button>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Batal</Button>
            <Button onClick={handleSave}>{editingProduct ? 'Simpan' : 'Tambah'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Hapus Produk</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Yakin ingin menghapus <strong className="text-foreground">{deletingProduct?.name}</strong>? Tindakan ini tidak bisa dibatalkan.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>Batal</Button>
            <Button variant="destructive" onClick={handleDelete}>Hapus</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
