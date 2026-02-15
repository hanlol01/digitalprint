import { useState } from 'react';
import { products, categories, formatCurrency } from '@/data/mockData';
import { Calculator as CalcIcon } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';

export default function CalculatorPage() {
  const [productId, setProductId] = useState(products[0].id);
  const [materialId, setMaterialId] = useState(products[0].materialVariants[0]?.id || '');
  const [width, setWidth] = useState(1);
  const [height, setHeight] = useState(1);
  const [qty, setQty] = useState(1);
  const [finishing, setFinishing] = useState(false);

  const product = products.find(p => p.id === productId)!;
  const material = product.materialVariants.find(m => m.id === materialId);
  const price = material ? material.pricePerUnit : product.basePrice;

  let total = 0;
  if (product.hasCustomSize) {
    total = width * height * price;
  } else {
    total = qty * price;
  }
  if (finishing && product.finishingCost > 0) total += product.finishingCost;

  return (
    <div className="max-w-xl mx-auto animate-fade-in">
      <div className="stat-card">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <CalcIcon className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h3 className="font-semibold text-foreground">Kalkulator Harga Cepat</h3>
            <p className="text-sm text-muted-foreground">Hitung estimasi harga produk</p>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium text-foreground mb-1.5 block">Produk</label>
            <Select value={productId} onValueChange={(v) => {
              setProductId(v);
              const p = products.find(x => x.id === v)!;
              setMaterialId(p.materialVariants[0]?.id || '');
            }}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {products.map(p => {
                  const cat = categories.find(c => c.id === p.categoryId);
                  return <SelectItem key={p.id} value={p.id}>{cat?.icon} {p.name}</SelectItem>;
                })}
              </SelectContent>
            </Select>
          </div>

          {product.materialVariants.length > 0 && (
            <div>
              <label className="text-sm font-medium text-foreground mb-1.5 block">Bahan</label>
              <Select value={materialId} onValueChange={setMaterialId}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {product.materialVariants.map(m => (
                    <SelectItem key={m.id} value={m.id}>{m.name} - {formatCurrency(m.pricePerUnit)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {product.hasCustomSize ? (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium text-foreground mb-1.5 block">
                  Panjang ({product.pricingUnit === 'per_cm' ? 'cm' : 'meter'})
                </label>
                <Input type="number" min={0.1} step={0.1} value={width} onChange={(e) => setWidth(Number(e.target.value))} />
              </div>
              <div>
                <label className="text-sm font-medium text-foreground mb-1.5 block">
                  Lebar ({product.pricingUnit === 'per_cm' ? 'cm' : 'meter'})
                </label>
                <Input type="number" min={0.1} step={0.1} value={height} onChange={(e) => setHeight(Number(e.target.value))} />
              </div>
            </div>
          ) : (
            <div>
              <label className="text-sm font-medium text-foreground mb-1.5 block">Jumlah</label>
              <Input type="number" min={1} value={qty} onChange={(e) => setQty(Number(e.target.value))} />
            </div>
          )}

          {product.finishingCost > 0 && (
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={finishing} onChange={(e) => setFinishing(e.target.checked)} className="rounded" />
              <span className="text-sm text-foreground">Finishing (+{formatCurrency(product.finishingCost)})</span>
            </label>
          )}

          <div className="bg-primary/5 border border-primary/20 rounded-xl p-6 text-center">
            <p className="text-sm text-muted-foreground mb-1">Estimasi Total</p>
            <p className="text-3xl font-bold text-primary">{formatCurrency(total)}</p>
            {product.hasCustomSize && (
              <p className="text-xs text-muted-foreground mt-2">
                {width} x {height} {product.pricingUnit === 'per_cm' ? 'cm' : 'm'} = {(width * height).toFixed(2)} {product.pricingUnit === 'per_cm' ? 'cm²' : 'm²'}
              </p>
            )}
            <p className="text-xs text-muted-foreground mt-1">⏱ Estimasi produksi: ~{product.estimatedMinutes} menit</p>
          </div>
        </div>
      </div>
    </div>
  );
}
