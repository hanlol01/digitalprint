import { useEffect, useMemo, useState } from "react";
import { Calculator as CalcIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCategories } from "@/hooks/useCategories";
import { useProducts } from "@/hooks/useProducts";
import { formatCurrency } from "@/lib/format";

const sanitizeCategoryIcon = (icon?: string | null): string | null => {
  const value = icon?.trim();
  if (!value) return null;
  return value.toLowerCase() === "box" ? null : value;
};

const normalizeDimensionForPricing = (value: number): number => {
  if (!Number.isFinite(value) || value <= 0) return 1;
  return value < 1 ? 1 : value;
};

export default function CalculatorPage() {
  const { data: categories = [] } = useCategories({ activeOnly: true });
  const { data: products = [] } = useProducts({ activeOnly: true });

  const [productId, setProductId] = useState<string>("");
  const [materialId, setMaterialId] = useState<string>("");
  const [width, setWidth] = useState(1);
  const [height, setHeight] = useState(1);
  const [qty, setQty] = useState(1);
  const [finishing, setFinishing] = useState(false);

  useEffect(() => {
    if (!productId && products.length > 0) {
      setProductId(products[0].id);
    }
  }, [products, productId]);

  const product = useMemo(() => products.find((item) => item.id === productId), [products, productId]);

  useEffect(() => {
    const selected = products.find((item) => item.id === productId);
    if (selected && selected.materialVariants.length > 0) {
      setMaterialId(selected.materialVariants[0].id);
    }
  }, [productId, products]);

  const material = product?.materialVariants.find((item) => item.id === materialId);
  const price = material ? material.sellingPrice : product?.materialVariants[0]?.sellingPrice ?? 0;
  const effectiveWidth = product?.hasCustomSize ? normalizeDimensionForPricing(width) : width;
  const effectiveHeight = product?.hasCustomSize ? normalizeDimensionForPricing(height) : height;
  const areaForPricing = effectiveWidth * effectiveHeight;
  const isAdjustedSize = product?.hasCustomSize ? width < 1 || height < 1 : false;

  let total = 0;
  if (product) {
    if (product.hasCustomSize) {
      total = areaForPricing * price;
    } else {
      total = qty * price;
    }
    if (finishing && product.finishingCost > 0) total += product.finishingCost;
  }

  if (!product) {
    return <div className="text-sm text-muted-foreground">Memuat data produk...</div>;
  }

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
            <Select
              value={productId}
              onValueChange={(value) => {
                setProductId(value);
                const selected = products.find((item) => item.id === value);
                setMaterialId(selected?.materialVariants[0]?.id ?? "");
              }}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {products.map((item) => {
                  const category = categories.find((row) => row.id === item.categoryId);
                  const categoryIcon = sanitizeCategoryIcon(category?.icon);
                  return (
                    <SelectItem key={item.id} value={item.id}>
                      {categoryIcon ? `${categoryIcon} ` : ""}
                      {item.name}
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>

          {product.materialVariants.length > 0 && (
            <div>
              <label className="text-sm font-medium text-foreground mb-1.5 block">Bahan</label>
              <Select value={materialId} onValueChange={setMaterialId}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {product.materialVariants.map((item) => (
                    <SelectItem key={item.id} value={item.id}>
                      {item.name} - {formatCurrency(item.sellingPrice)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {product.hasCustomSize ? (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium text-foreground mb-1.5 block">Panjang</label>
                <Input type="number" min={0.1} step={0.1} value={width} onChange={(e) => setWidth(Number(e.target.value))} />
              </div>
              <div>
                <label className="text-sm font-medium text-foreground mb-1.5 block">Lebar</label>
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
                {isAdjustedSize
                  ? `${width} x ${height} -> dihitung ${effectiveWidth} x ${effectiveHeight} = ${areaForPricing.toFixed(2)}`
                  : `${width} x ${height} = ${areaForPricing.toFixed(2)}`}
              </p>
            )}
            <p className="text-xs text-muted-foreground mt-1">Estimasi produksi: ~{product.estimatedMinutes} menit</p>
          </div>
          <Button type="button" variant="outline" className="w-full">
            Simulasi Selesai
          </Button>
        </div>
      </div>
    </div>
  );
}
