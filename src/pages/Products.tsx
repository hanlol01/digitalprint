import { useState } from 'react';
import { products, categories, formatCurrency } from '@/data/mockData';
import { Search, Plus, Edit, Package } from 'lucide-react';
import { Input } from '@/components/ui/input';

export default function Products() {
  const [search, setSearch] = useState('');
  const [selectedCat, setSelectedCat] = useState('all');

  const filtered = products.filter(p => {
    if (selectedCat !== 'all' && p.categoryId !== selectedCat) return false;
    if (search && !p.name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const pricingLabel: Record<string, string> = { per_lembar: 'Per Lembar', per_meter: 'Per m²', per_cm: 'Per cm²', per_pcs: 'Per Pcs' };

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Cari produk..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 bg-card" />
        </div>
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
            <div key={product.id} className="stat-card">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="text-2xl">{cat?.icon}</div>
                  <div>
                    <h4 className="font-semibold text-foreground">{product.name}</h4>
                    <p className="text-xs text-muted-foreground">{cat?.name} • {pricingLabel[product.pricingUnit]}</p>
                  </div>
                </div>
                {product.hasCustomSize && <span className="badge-status bg-info/10 text-info">Custom</span>}
              </div>
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
    </div>
  );
}
