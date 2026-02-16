import { useState } from 'react';
import { mockMaterialStock } from '@/data/mockData';
import { AlertTriangle, Package, RefreshCw, Plus, Edit, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { toast } from 'sonner';
import type { MaterialStock } from '@/types';

const emptyMaterial: Omit<MaterialStock, 'id'> = {
  name: '', unit: '', currentStock: 0, minStock: 0, lastRestocked: new Date().toISOString().split('T')[0],
};

export default function Materials() {
  const [materials, setMaterials] = useState<MaterialStock[]>(mockMaterialStock);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editingMaterial, setEditingMaterial] = useState<MaterialStock | null>(null);
  const [deletingMaterial, setDeletingMaterial] = useState<MaterialStock | null>(null);
  const [form, setForm] = useState<Omit<MaterialStock, 'id'>>(emptyMaterial);

  const lowStock = materials.filter(m => m.currentStock <= m.minStock);

  const openCreate = () => {
    setEditingMaterial(null);
    setForm({ ...emptyMaterial, lastRestocked: new Date().toISOString().split('T')[0] });
    setDialogOpen(true);
  };

  const openEdit = (m: MaterialStock) => {
    setEditingMaterial(m);
    setForm({ name: m.name, unit: m.unit, currentStock: m.currentStock, minStock: m.minStock, lastRestocked: m.lastRestocked });
    setDialogOpen(true);
  };

  const openDelete = (m: MaterialStock) => {
    setDeletingMaterial(m);
    setDeleteDialogOpen(true);
  };

  const handleSave = () => {
    if (!form.name.trim()) { toast.error('Nama bahan wajib diisi'); return; }
    if (!form.unit.trim()) { toast.error('Satuan wajib diisi'); return; }

    if (editingMaterial) {
      setMaterials(list => list.map(m => m.id === editingMaterial.id ? { ...m, ...form } : m));
      toast.success('Bahan berhasil diperbarui');
    } else {
      setMaterials(list => [...list, { id: `m_${Date.now()}`, ...form }]);
      toast.success('Bahan berhasil ditambahkan');
    }
    setDialogOpen(false);
  };

  const handleDelete = () => {
    if (!deletingMaterial) return;
    setMaterials(list => list.filter(m => m.id !== deletingMaterial.id));
    toast.success('Bahan berhasil dihapus');
    setDeleteDialogOpen(false);
  };

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex justify-between items-center">
        <div />
        <Button onClick={openCreate} className="gap-2">
          <Plus className="w-4 h-4" /> Tambah Bahan
        </Button>
      </div>

      {lowStock.length > 0 && (
        <div className="bg-warning/10 border border-warning/30 rounded-xl p-4 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-warning shrink-0 mt-0.5" />
          <div>
            <h4 className="font-semibold text-foreground text-sm">Stok Menipis!</h4>
            <p className="text-sm text-muted-foreground">
              {lowStock.map(m => m.name).join(', ')} memerlukan restok segera.
            </p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
        {materials.map(material => {
          const isLow = material.currentStock <= material.minStock;
          const percentage = Math.min(100, (material.currentStock / (material.minStock * 3)) * 100);
          return (
            <div key={material.id} className={`stat-card group ${isLow ? 'border-warning/50' : ''}`}>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Package className={`w-5 h-5 ${isLow ? 'text-warning' : 'text-primary'}`} />
                  <h4 className="font-semibold text-foreground text-sm">{material.name}</h4>
                </div>
                <div className="flex items-center gap-1">
                  {isLow && <AlertTriangle className="w-4 h-4 text-warning" />}
                  <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(material)}>
                      <Edit className="w-3.5 h-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => openDelete(material)}>
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              </div>
              <div className="flex items-end justify-between mb-2">
                <div>
                  <p className="text-2xl font-bold text-foreground">{material.currentStock}</p>
                  <p className="text-xs text-muted-foreground">{material.unit}</p>
                </div>
                <p className="text-xs text-muted-foreground">Min: {material.minStock} {material.unit}</p>
              </div>
              <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${isLow ? 'bg-warning' : 'bg-primary'}`}
                  style={{ width: `${percentage}%` }}
                />
              </div>
              <p className="text-[10px] text-muted-foreground mt-2 flex items-center gap-1">
                <RefreshCw className="w-3 h-3" /> Restok terakhir: {material.lastRestocked}
              </p>
            </div>
          );
        })}
      </div>

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingMaterial ? 'Edit Bahan' : 'Tambah Bahan Baru'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Nama Bahan</Label>
              <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Contoh: Tinta Cyan" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Satuan</Label>
                <Input value={form.unit} onChange={e => setForm(f => ({ ...f, unit: e.target.value }))} placeholder="ml, meter, rim" />
              </div>
              <div className="space-y-2">
                <Label>Stok Saat Ini</Label>
                <Input type="number" value={form.currentStock} onChange={e => setForm(f => ({ ...f, currentStock: Number(e.target.value) }))} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Stok Minimum</Label>
                <Input type="number" value={form.minStock} onChange={e => setForm(f => ({ ...f, minStock: Number(e.target.value) }))} />
              </div>
              <div className="space-y-2">
                <Label>Tanggal Restok</Label>
                <Input type="date" value={form.lastRestocked} onChange={e => setForm(f => ({ ...f, lastRestocked: e.target.value }))} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Batal</Button>
            <Button onClick={handleSave}>{editingMaterial ? 'Simpan' : 'Tambah'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Hapus Bahan</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Yakin ingin menghapus <strong className="text-foreground">{deletingMaterial?.name}</strong>? Tindakan ini tidak bisa dibatalkan.
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
