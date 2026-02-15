import { mockMaterialStock } from '@/data/mockData';
import { AlertTriangle, Package, RefreshCw } from 'lucide-react';

export default function Materials() {
  const lowStock = mockMaterialStock.filter(m => m.currentStock <= m.minStock);

  return (
    <div className="space-y-4 animate-fade-in">
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
        {mockMaterialStock.map(material => {
          const isLow = material.currentStock <= material.minStock;
          const percentage = Math.min(100, (material.currentStock / (material.minStock * 3)) * 100);
          return (
            <div key={material.id} className={`stat-card ${isLow ? 'border-warning/50' : ''}`}>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Package className={`w-5 h-5 ${isLow ? 'text-warning' : 'text-primary'}`} />
                  <h4 className="font-semibold text-foreground text-sm">{material.name}</h4>
                </div>
                {isLow && <AlertTriangle className="w-4 h-4 text-warning" />}
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
    </div>
  );
}
